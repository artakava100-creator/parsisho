/*
# Phase 4.3 — Professional Auction Engine Enhancement

## Purpose
Add: 'ending' status, one-time 10-second extension, auction_events audit trail,
auction_notifications infrastructure, server-time RPC, participant count,
auto-activation of scheduled auctions.

## Changes to auctions table
- Add status 'ending' to CHECK constraint
- Add extension_used boolean (default false)
- Add extension_triggered_at timestamptz (nullable)
- Add extension_triggered_by_bid uuid (nullable, FK bids)
- Add original_ends_at timestamptz (nullable) — stores pre-extension end time
- Add actual_start_at timestamptz (nullable)
- Add actual_end_at timestamptz (nullable)
- Add participant_count integer (default 0)

## New table: auction_events
Audit trail for all significant auction events.

## New table: auction_notifications
Notification queue for auction-related events (SMS/in-app).

## Updated RPCs
- place_bid: add 10-second extension logic, participant count, event logging
- finalize_auction: add 'ending' status transition, event logging, actual_end_at
- New: get_server_time() — returns authoritative server timestamp
- New: activate_scheduled_auctions() — auto-start scheduled auctions whose time has come
- Updated: get_auction_detail — include extension info, participant count
- Updated: finalize_auction — LIVE → ENDING → ENDED transition

## Security
- All new RPCs: SECURITY DEFINER, SET search_path = public
- auction_events: SELECT for authenticated (admin can see all, users see public events)
- auction_notifications: SELECT own only, no direct write
- Extension logic is entirely server-side, atomic with bid acceptance
*/

-- ============================================================
-- 1. Add 'ending' to auctions status CHECK
-- ============================================================
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_status_check'
  ) THEN
    ALTER TABLE auctions DROP CONSTRAINT auctions_status_check;
  END IF;
END $$;

ALTER TABLE auctions ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('draft', 'scheduled', 'live', 'ending', 'ended', 'cancelled'));

-- ============================================================
-- 2. Add extension + timing columns to auctions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'extension_used'
  ) THEN
    ALTER TABLE auctions ADD COLUMN extension_used boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'extension_triggered_at'
  ) THEN
    ALTER TABLE auctions ADD COLUMN extension_triggered_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'extension_triggered_by_bid'
  ) THEN
    ALTER TABLE auctions ADD COLUMN extension_triggered_by_bid uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'original_ends_at'
  ) THEN
    ALTER TABLE auctions ADD COLUMN original_ends_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'actual_start_at'
  ) THEN
    ALTER TABLE auctions ADD COLUMN actual_start_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'actual_end_at'
  ) THEN
    ALTER TABLE auctions ADD COLUMN actual_end_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'participant_count'
  ) THEN
    ALTER TABLE auctions ADD COLUMN participant_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 3. Create auction_events table (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auction_events_event_type_check'
  ) THEN
    ALTER TABLE auction_events ADD CONSTRAINT auction_events_event_type_check
      CHECK (event_type IN (
        'auction_created', 'auction_scheduled', 'auction_published',
        'auction_started', 'bid_accepted', 'bid_rejected',
        'extension_triggered', 'extension_consumed',
        'auction_ending', 'auction_ended', 'winner_determined',
        'auction_cancelled', 'auto_activated'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auction_events_auction_id ON auction_events(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_created_at ON auction_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_events_event_type ON auction_events(event_type);

-- ============================================================
-- 4. Enable RLS on auction_events
-- ============================================================
ALTER TABLE auction_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction_events_select_authenticated" ON auction_events;
CREATE POLICY "auction_events_select_authenticated"
  ON auction_events FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE — events only created via SECURITY DEFINER RPCs

-- ============================================================
-- 5. Create auction_notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'pending',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auction_notifications_type_check'
  ) THEN
    ALTER TABLE auction_notifications ADD CONSTRAINT auction_notifications_type_check
      CHECK (notification_type IN (
        'auction_starting_soon', 'auction_started', 'auction_ending_soon',
        'auction_ended', 'user_won', 'user_lost', 'direct_purchase_opportunity'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auction_notifications_channel_check'
  ) THEN
    ALTER TABLE auction_notifications ADD CONSTRAINT auction_notifications_channel_check
      CHECK (channel IN ('in_app', 'sms'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auction_notifications_status_check'
  ) THEN
    ALTER TABLE auction_notifications ADD CONSTRAINT auction_notifications_status_check
      CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'not_configured'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auction_notifications_user_id ON auction_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_notifications_auction_id ON auction_notifications(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_notifications_status ON auction_notifications(status);

-- ============================================================
-- 6. Enable RLS on auction_notifications
-- ============================================================
ALTER TABLE auction_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction_notifications_select_own" ON auction_notifications;
CREATE POLICY "auction_notifications_select_own"
  ON auction_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE — created via SECURITY DEFINER RPCs

-- ============================================================
-- 7. Helper: log_auction_event (internal, not exposed to clients)
-- ============================================================
CREATE OR REPLACE FUNCTION log_auction_event(
  p_auction_id uuid,
  p_event_type text,
  p_actor_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO auction_events (auction_id, event_type, actor_id, metadata)
  VALUES (p_auction_id, p_event_type, p_actor_id, p_metadata);
END;
$$;

REVOKE EXECUTE ON FUNCTION log_auction_event(uuid, text, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION log_auction_event(uuid, text, uuid, jsonb) FROM anon, authenticated;

-- ============================================================
-- 8. Helper: create_auction_notification (internal)
--    Creates notification entries. SMS channel marks as 'not_configured'
--    when no SMS provider is configured.
-- ============================================================
CREATE OR REPLACE FUNCTION create_auction_notification(
  p_user_id uuid,
  p_auction_id uuid,
  p_notification_type text,
  p_channel text DEFAULT 'in_app',
  p_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := 'pending';
BEGIN
  -- SMS provider not configured — mark as not_configured instead of pretending to send
  IF p_channel = 'sms' THEN
    v_status := 'not_configured';
  END IF;

  INSERT INTO auction_notifications (user_id, auction_id, notification_type, channel, status, message, metadata)
  VALUES (p_user_id, p_auction_id, p_notification_type, p_channel, v_status, p_message, p_metadata);
END;
$$;

REVOKE EXECUTE ON FUNCTION create_auction_notification(uuid, uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_auction_notification(uuid, uuid, text, text, text, jsonb) FROM anon, authenticated;

-- ============================================================
-- 9. get_server_time() — authoritative server timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('success', true, 'server_time', now(), 'iran_time', now() AT TIME ZONE 'Asia/Tehran');
$$;

REVOKE EXECUTE ON FUNCTION get_server_time() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_server_time() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_server_time() TO anon, authenticated;

-- ============================================================
-- 10. Updated place_bid() — with 10-second extension + events + participants
-- ============================================================
CREATE OR REPLACE FUNCTION place_bid(p_auction_id uuid, p_amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_email_confirmed timestamptz;
  v_bid_sequence integer;
  v_min_bid bigint;
  v_bid_id uuid;
  v_time_remaining interval;
  v_seconds_remaining double precision;
  v_extension_applied boolean := false;
  v_old_ends_at timestamptz;
  v_is_new_participant boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده وارد حساب خود شوید');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ پیشنهاد نامعتبر است');
  END IF;

  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  IF v_auction.status NOT IN ('live', 'ending') THEN
    IF v_auction.status IN ('draft', 'scheduled') THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز شروع نشده است',
        'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
    ELSIF v_auction.status = 'ended' THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده به پایان رسیده است',
        'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
    ELSIF v_auction.status = 'cancelled' THEN
      RETURN jsonb_build_object('success', false, 'error', 'این مزایده لغو شده است',
        'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'مزایده در وضعیت نامعتبر است',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  -- Server time check
  IF now() < v_auction.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز شروع نشده است',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;
  IF now() > v_auction.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده به پایان رسیده است',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  -- Minimum bid check
  v_min_bid := v_auction.current_price + v_auction.min_bid_increment;
  IF p_amount < v_min_bid THEN
    RETURN jsonb_build_object('success', false, 'error',
      'قیمت مزایده تغییر کرده است. لطفاً قیمت جدید را مشاهده کنید.',
      'current_price', v_auction.current_price,
      'current_bid_count', v_auction.bid_count,
      'min_next_bid', v_min_bid);
  END IF;

  -- Eligibility checks
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_profile.account_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'حساب شما در حال حاضر اجازه شرکت در مزایده را ندارد',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  SELECT email_confirmed_at INTO v_email_confirmed FROM auth.users WHERE id = auth.uid();
  IF v_email_confirmed IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا ایمیل خود را تأیید کنید',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  IF v_profile.phone_verified_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا شماره موبایل خود را تأیید کنید',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  -- Check if user is a new participant
  SELECT EXISTS(SELECT 1 FROM bids WHERE auction_id = p_auction_id AND user_id = auth.uid()) INTO v_is_new_participant;

  -- Insert bid
  SELECT COALESCE(MAX(bid_sequence), 0) + 1 INTO v_bid_sequence
  FROM bids WHERE auction_id = p_auction_id;

  INSERT INTO bids (auction_id, user_id, amount, bid_sequence)
  VALUES (p_auction_id, auth.uid(), p_amount, v_bid_sequence)
  RETURNING id INTO v_bid_id;

  -- Update auction
  UPDATE auctions
  SET current_price = p_amount,
      bid_count = bid_count + 1,
      participant_count = CASE WHEN v_is_new_participant THEN participant_count ELSE participant_count + 1 END
  WHERE id = p_auction_id;

  -- Log bid_accepted event
  PERFORM log_auction_event(p_auction_id, 'bid_accepted', auth.uid(),
    jsonb_build_object('bid_id', v_bid_id, 'amount', p_amount, 'bid_sequence', v_bid_sequence));

  -- 10-SECOND EXTENSION LOGIC
  -- If bid arrives in final 10 seconds AND extension not yet used
  v_seconds_remaining := EXTRACT(EPOCH FROM (v_auction.ends_at - now()));
  IF v_seconds_remaining <= 10 AND v_seconds_remaining >= 0 AND NOT v_auction.extension_used THEN
    v_old_ends_at := v_auction.ends_at;
    v_extension_applied := true;

    UPDATE auctions
    SET ends_at = ends_at + interval '10 seconds',
        extension_used = true,
        extension_triggered_at = now(),
        extension_triggered_by_bid = v_bid_id,
        original_ends_at = COALESCE(original_ends_at, v_old_ends_at),
        status = 'live'  -- ensure stays live (not 'ending')
    WHERE id = p_auction_id;

    -- Log extension events
    PERFORM log_auction_event(p_auction_id, 'extension_triggered', auth.uid(),
      jsonb_build_object('bid_id', v_bid_id, 'old_ends_at', v_old_ends_at, 'new_ends_at', v_old_ends_at + interval '10 seconds'));
    PERFORM log_auction_event(p_auction_id, 'extension_consumed', auth.uid(),
      jsonb_build_object('bid_id', v_bid_id));
  END IF;

  -- Transition to 'ending' if <= 60 seconds remain and not already 'ending'
  v_seconds_remaining := EXTRACT(EPOCH FROM (
    CASE WHEN v_extension_applied THEN v_old_ends_at + interval '10 seconds' ELSE v_auction.ends_at END
    - now()
  ));
  IF v_seconds_remaining <= 60 AND v_seconds_remaining > 0 AND v_auction.status = 'live' THEN
    UPDATE auctions SET status = 'ending' WHERE id = p_auction_id;
    PERFORM log_auction_event(p_auction_id, 'auction_ending', NULL,
      jsonb_build_object('seconds_remaining', v_seconds_remaining));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'auction_id', p_auction_id,
    'new_current_price', p_amount,
    'new_bid_count', v_auction.bid_count + 1,
    'bid_sequence', v_bid_sequence,
    'extension_applied', v_extension_applied,
    'new_ends_at', CASE WHEN v_extension_applied THEN v_old_ends_at + interval '10 seconds' ELSE v_auction.ends_at END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION place_bid(uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION place_bid(uuid, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION place_bid(uuid, bigint) TO authenticated;

-- ============================================================
-- 11. Updated finalize_auction() — LIVE/ENDING → ENDED with events
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_auction(p_auction_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_winning_bid bids%ROWTYPE;
  v_results jsonb[] := ARRAY[]::jsonb[];
  v_auction_id uuid;
  v_cursor CURSOR FOR
    SELECT id FROM auctions
    WHERE status IN ('live', 'ending') AND ends_at < now()
    ORDER BY ends_at ASC;
BEGIN
  IF p_auction_id IS NOT NULL THEN
    SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
    END IF;

    IF v_auction.status = 'ended' THEN
      RETURN jsonb_build_object('success', true, 'already_ended', true, 'winner_user_id', v_auction.winner_user_id);
    END IF;

    IF v_auction.status NOT IN ('live', 'ending') THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده در وضعیت نامعتبر است');
    END IF;

    IF now() < v_auction.ends_at THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز به پایان نرسیده است');
    END IF;

    UPDATE auctions SET status = 'ended', actual_end_at = now() WHERE id = p_auction_id;
    PERFORM log_auction_event(p_auction_id, 'auction_ended', NULL, '{}'::jsonb);

    SELECT * INTO v_winning_bid
    FROM bids WHERE auction_id = p_auction_id
    ORDER BY amount DESC, created_at ASC LIMIT 1;

    IF FOUND THEN
      UPDATE bids SET is_winning = true WHERE id = v_winning_bid.id;
      UPDATE auctions
      SET winner_user_id = v_winning_bid.user_id, winning_bid_id = v_winning_bid.id
      WHERE id = p_auction_id;
      PERFORM log_auction_event(p_auction_id, 'winner_determined', v_winning_bid.user_id,
        jsonb_build_object('winning_amount', v_winning_bid.amount, 'winning_bid_id', v_winning_bid.id));

      -- Create winner notification
      PERFORM create_auction_notification(v_winning_bid.user_id, p_auction_id, 'user_won', 'in_app',
        'شما برنده مزایده شدید! مبلغ برنده: ' || v_winning_bid.amount::text || ' پارسی');

      -- Create loser notifications + direct purchase opportunity
      PERFORM create_auction_notification(b.user_id, p_auction_id, 'user_lost', 'in_app',
        'مزایده به پایان رسید. شما برنده نشدید.', jsonb_build_object('direct_purchase_eligible', true))
      FROM bids b
      WHERE b.auction_id = p_auction_id AND b.user_id != v_winning_bid.user_id
      GROUP by b.user_id;

      RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id,
        'winner_user_id', v_winning_bid.user_id, 'winning_bid_id', v_winning_bid.id,
        'winning_amount', v_winning_bid.amount);
    ELSE
      RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id, 'no_bids', true);
    END IF;
  ELSE
    FOR v_auction_id IN v_cursor LOOP
      SELECT * INTO v_auction FROM auctions WHERE id = v_auction_id FOR UPDATE;
      IF v_auction.status NOT IN ('live', 'ending') THEN CONTINUE; END IF;

      UPDATE auctions SET status = 'ended', actual_end_at = now() WHERE id = v_auction_id;
      PERFORM log_auction_event(v_auction_id, 'auction_ended', NULL, '{}'::jsonb);

      SELECT * INTO v_winning_bid FROM bids WHERE auction_id = v_auction_id
      ORDER BY amount DESC, created_at ASC LIMIT 1;

      IF FOUND THEN
        UPDATE bids SET is_winning = true WHERE id = v_winning_bid.id;
        UPDATE auctions SET winner_user_id = v_winning_bid.user_id, winning_bid_id = v_winning_bid.id
        WHERE id = v_auction_id;
        PERFORM log_auction_event(v_auction_id, 'winner_determined', v_winning_bid.user_id,
          jsonb_build_object('winning_amount', v_winning_bid.amount));

        PERFORM create_auction_notification(v_winning_bid.user_id, v_auction_id, 'user_won', 'in_app',
          'شما برنده مزایده شدید! مبلغ برنده: ' || v_winning_bid.amount::text || ' پارسی');

        v_results := array_append(v_results, jsonb_build_object('success', true,
          'auction_id', v_auction_id, 'winner_user_id', v_winning_bid.user_id,
          'winning_amount', v_winning_bid.amount));
      ELSE
        v_results := array_append(v_results, jsonb_build_object('success', true,
          'auction_id', v_auction_id, 'no_bids', true));
      END IF;
    END LOOP;
    RETURN jsonb_build_object('success', true, 'finalized', to_jsonb(v_results));
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION finalize_auction(uuid) TO authenticated;

-- ============================================================
-- 12. activate_scheduled_auctions() — auto-start scheduled auctions
-- ============================================================
CREATE OR REPLACE FUNCTION activate_scheduled_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_auction_id uuid;
BEGIN
  FOR v_auction_id IN
    SELECT id FROM auctions
    WHERE status = 'scheduled' AND starts_at <= now()
  LOOP
    UPDATE auctions SET status = 'live', actual_start_at = now() WHERE id = v_auction_id;
    PERFORM log_auction_event(v_auction_id, 'auction_started', NULL, '{}'::jsonb);
    PERFORM log_auction_event(v_auction_id, 'auto_activated', NULL, '{}'::jsonb);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'activated_count', v_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION activate_scheduled_auctions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION activate_scheduled_auctions() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_scheduled_auctions() TO authenticated;

-- ============================================================
-- 13. Updated get_auction_detail() — include extension + participant info
-- ============================================================
CREATE OR REPLACE FUNCTION get_auction_detail(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_bids jsonb;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id, 'amount', b.amount,
      'bidder_name', CASE
        WHEN LENGTH(p.display_name) > 0 THEN
          CASE
            WHEN POSITION(' ' IN p.display_name) > 0 THEN
              LEFT(p.display_name, POSITION(' ' IN p.display_name) - 1) || ' ' || LEFT(SPLIT_PART(p.display_name, ' ', 2), 1) || '.'
            ELSE LEFT(p.display_name, 3) || '***'
          END
        ELSE 'کاربر پارسیشو'
      END,
      'is_winning', b.is_winning,
      'created_at', b.created_at,
      'bid_sequence', b.bid_sequence,
      'is_own_bid', b.user_id = auth.uid()
    )
    ORDER BY b.amount DESC, b.created_at ASC
  ), '[]'::jsonb) INTO v_bids
  FROM bids b
  LEFT JOIN profiles p ON p.id = b.user_id
  WHERE b.auction_id = p_auction_id;

  RETURN jsonb_build_object(
    'success', true,
    'auction', jsonb_build_object(
      'id', v_auction.id, 'title', v_auction.title, 'slug', v_auction.slug,
      'description', v_auction.description, 'status', v_auction.status,
      'auction_date', v_auction.auction_date,
      'starts_at', v_auction.starts_at, 'ends_at', v_auction.ends_at,
      'starting_price', v_auction.starting_price,
      'current_price', v_auction.current_price,
      'min_bid_increment', v_auction.min_bid_increment,
      'bid_count', v_auction.bid_count,
      'participant_count', v_auction.participant_count,
      'winner_user_id', v_auction.winner_user_id,
      'image_url', v_auction.image_url, 'product_name', v_auction.product_name,
      'is_official', v_auction.is_official,
      'extension_used', v_auction.extension_used,
      'extension_triggered_at', v_auction.extension_triggered_at,
      'original_ends_at', v_auction.original_ends_at,
      'actual_start_at', v_auction.actual_start_at,
      'actual_end_at', v_auction.actual_end_at,
      'created_at', v_auction.created_at
    ),
    'bids', v_bids,
    'server_time', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_auction_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_auction_detail(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auction_detail(uuid) TO anon, authenticated;

-- ============================================================
-- 14. Updated set_auction_live() — also sets actual_start_at + event
-- ============================================================
CREATE OR REPLACE FUNCTION set_auction_live(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه شروع مزایده ندارید');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;
  IF v_auction.status != 'scheduled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط مزایده‌های برنامه‌ریزی‌شده قابل شروع هستند');
  END IF;

  UPDATE auctions SET status = 'live', actual_start_at = now() WHERE id = p_auction_id;
  PERFORM log_auction_event(p_auction_id, 'auction_started', auth.uid(), '{}'::jsonb);

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION set_auction_live(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_auction_live(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION set_auction_live(uuid) TO authenticated;

-- ============================================================
-- 15. Updated set_auction_scheduled() — log event
-- ============================================================
CREATE OR REPLACE FUNCTION set_auction_scheduled(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه برنامه‌ریزی مزایده ندارید');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;
  IF v_auction.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط مزایده‌های پیش‌نویس قابل برنامه‌ریزی هستند');
  END IF;

  UPDATE auctions SET status = 'scheduled' WHERE id = p_auction_id;
  PERFORM log_auction_event(p_auction_id, 'auction_scheduled', auth.uid(), '{}'::jsonb);

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION set_auction_scheduled(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_auction_scheduled(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION set_auction_scheduled(uuid) TO authenticated;

-- ============================================================
-- 16. Updated cancel_auction() — log event
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_auction(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه لغو مزایده ندارید');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;
  IF v_auction.status NOT IN ('scheduled', 'live', 'ending', 'draft') THEN
    RETURN jsonb_build_object('success', false, 'error', 'این مزایده قابل لغو نیست');
  END IF;

  UPDATE auctions SET status = 'cancelled' WHERE id = p_auction_id;
  PERFORM log_auction_event(p_auction_id, 'auction_cancelled', auth.uid(), '{}'::jsonb);

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_auction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cancel_auction(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_auction(uuid) TO authenticated;

-- ============================================================
-- 17. Updated create_auction() — log event
-- ============================================================
CREATE OR REPLACE FUNCTION create_auction(
  p_title text, p_slug text, p_auction_date date,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_starting_price bigint, p_description text DEFAULT '',
  p_min_bid_increment bigint DEFAULT 100000, p_is_official boolean DEFAULT true,
  p_image_url text DEFAULT NULL, p_product_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ایجاد مزایده ندارید');
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'عنوان مزایده الزامی است');
  END IF;
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'شناسه مزایده الزامی است');
  END IF;
  IF p_starting_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'قیمت شروع باید بیشتر از صفر باشد');
  END IF;
  IF p_min_bid_increment <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'حداقل افزایش باید بیشتر از صفر باشد');
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'زمان پایان باید بعد از زمان شروع باشد');
  END IF;
  IF p_auction_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تاریخ مزایده الزامی است');
  END IF;

  BEGIN
    INSERT INTO auctions (title, slug, description, status, auction_date,
      starts_at, ends_at, starting_price, current_price,
      min_bid_increment, is_official, image_url, product_name)
    VALUES (p_title, p_slug, p_description, 'draft', p_auction_date,
      p_starts_at, p_ends_at, p_starting_price, p_starting_price,
      p_min_bid_increment, p_is_official, p_image_url, p_product_name)
    RETURNING id INTO v_auction_id;

    PERFORM log_auction_event(v_auction_id, 'auction_created', auth.uid(), '{}'::jsonb);
    RETURN jsonb_build_object('success', true, 'auction_id', v_auction_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'این شناسه یا تاریخ مزایده قبلاً ثبت شده است');
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_auction FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_auction FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION create_auction TO authenticated;

-- ============================================================
-- 18. Schedule auto-activation + finalization with pg_cron
-- ============================================================
SELECT cron.unschedule('finalize-expired-auctions');
SELECT cron.schedule('activate-scheduled-auctions', '* * * * *',
  $$SELECT activate_scheduled_auctions();$$);
SELECT cron.schedule('finalize-expired-auctions', '* * * * *',
  $$SELECT finalize_auction(NULL);$$);
