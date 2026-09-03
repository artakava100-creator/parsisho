/*
# Phase 3 Hardening: Iran timezone, official auction uniqueness, stale bid detection

## Purpose
This migration hardens the auction engine with three critical improvements:

1. **Iran timezone strategy**: Adds a helper function `get_iran_today()` that returns
   the current date in Iran Standard Time (Asia/Tehran, UTC+3:30, no DST). This ensures
   that "today's auction" is determined consistently regardless of server or browser
   timezone. All date comparisons for daily auction categorization should use this function.

2. **Official daily auction uniqueness**: Adds `is_official` boolean column (default true)
   and a partial unique index on `auction_date WHERE is_official = true`. This enforces
   that only ONE official auction can exist per calendar day, while allowing future
   expansion to non-official/special auctions on the same day. The existing plain UNIQUE
   constraint on `auction_date` is replaced by this partial unique index.

3. **Stale bid detection**: Updates `place_bid` to return `current_price` and
   `current_bid_count` in ALL rejection responses (not just success). This allows the
   frontend to detect stale state and show "قیمت مزایده تغییر کرده است" when a bid
   is rejected because another user already bid higher.

4. **Auto-finalization support**: Updates `finalize_auction` to accept NULL auction_id,
   in which case it finds ALL live auctions whose `ends_at` has passed and finalizes them.
   This enables a scheduled edge function to call `finalize_auction(NULL)` periodically.

## Changes

### auctions table
- Add `is_official` boolean column (NOT NULL, DEFAULT true)
- Drop the plain UNIQUE constraint `auctions_auction_date_unique`
- Add partial unique index: only one official auction per date

### New function: get_iran_today()
- Returns `date` — current date in Iran timezone
- Uses `AT TIME ZONE 'Asia/Tehran'` for correct conversion
- Iran does not observe DST, so this is stable year-round

### Updated function: place_bid()
- All error responses now include `current_price` and `current_bid_count` fields
- This lets the frontend detect stale state and show appropriate messages
- Bid sequence generation now uses `FOR UPDATE` lock on auction row (already present)
  plus a subquery with MAX — safe because the auction row is locked

### Updated function: finalize_auction()
- Accepts NULL `p_auction_id` — when NULL, finds all live auctions where `now() > ends_at`
  and finalizes each one
- Returns an array of results for batch mode, single result for specific auction
- Still idempotent — already-ended auctions are skipped

## Security Notes
1. `get_iran_today()` is SECURITY DEFINER, execute granted to anon + authenticated
2. `place_bid` and `finalize_auction` remain SECURITY DEFINER
3. `finalize_auction` with NULL parameter is designed for service-role/scheduled use
   but is safe for any caller — it only finalizes auctions that are already past end time
4. No new RLS policy changes — existing policies remain correct
*/

-- ============================================================
-- 1. Add is_official column to auctions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'is_official'
  ) THEN
    ALTER TABLE auctions ADD COLUMN is_official boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================================
-- 2. Replace plain UNIQUE with partial unique index
--    Only one OFFICIAL auction per date; non-official auctions
--    can coexist on the same date for future expansion
-- ============================================================
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_auction_date_unique'
  ) THEN
    ALTER TABLE auctions DROP CONSTRAINT auctions_auction_date_unique;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auctions_official_date_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_auctions_official_date_unique
    ON auctions (auction_date)
    WHERE is_official = true;
  END IF;
END $$;

-- ============================================================
-- 3. get_iran_today() — returns current date in Iran timezone
--    Iran Standard Time: UTC+3:30, no DST (Iran abolished DST in 2022)
-- ============================================================
CREATE OR REPLACE FUNCTION get_iran_today()
RETURNS date
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Tehran')::date;
$$;

REVOKE EXECUTE ON FUNCTION get_iran_today() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_iran_today() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_iran_today() TO anon, authenticated;

-- ============================================================
-- 4. Updated place_bid() — returns current_price on all rejections
--    This enables stale-bid detection on the frontend
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
BEGIN
  -- 1. Verify authentication
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده وارد حساب خود شوید');
  END IF;

  -- 2. Verify amount is positive
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ پیشنهاد نامعتبر است');
  END IF;

  -- 3. Lock the auction row for the duration of this transaction
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  -- 4. Verify auction exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  -- 5. Verify auction is live
  IF v_auction.status != 'live' THEN
    IF v_auction.status = 'draft' OR v_auction.status = 'scheduled' THEN
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

  -- 6. Verify current server time is within auction window
  IF now() < v_auction.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز شروع نشده است',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;
  IF now() > v_auction.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده به پایان رسیده است',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  -- 7. Verify bid amount meets minimum
  v_min_bid := v_auction.current_price + v_auction.min_bid_increment;
  IF p_amount < v_min_bid THEN
    RETURN jsonb_build_object('success', false, 'error',
      'قیمت مزایده تغییر کرده است. لطفاً قیمت جدید را مشاهده کنید.',
      'current_price', v_auction.current_price,
      'current_bid_count', v_auction.bid_count,
      'min_next_bid', v_min_bid);
  END IF;

  -- 8. Fetch user profile for eligibility checks
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = auth.uid();

  -- 9. Verify account status
  IF NOT FOUND OR v_profile.account_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'حساب شما در حال حاضر اجازه شرکت در مزایده را ندارد',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  -- 10. Verify email is confirmed (from auth.users)
  SELECT email_confirmed_at INTO v_email_confirmed
  FROM auth.users
  WHERE id = auth.uid();

  IF v_email_confirmed IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا ایمیل خود را تأیید کنید',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  -- 11. Verify phone is verified
  IF v_profile.phone_verified_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا شماره موبایل خود را تأیید کنید',
      'current_price', v_auction.current_price, 'current_bid_count', v_auction.bid_count);
  END IF;

  -- 12. Get next bid sequence number (safe under FOR UPDATE lock on auction row)
  SELECT COALESCE(MAX(bid_sequence), 0) + 1 INTO v_bid_sequence
  FROM bids
  WHERE auction_id = p_auction_id;

  -- 13. Insert the bid
  INSERT INTO bids (auction_id, user_id, amount, bid_sequence)
  VALUES (p_auction_id, auth.uid(), p_amount, v_bid_sequence);

  -- 14. Update auction current price and bid count
  UPDATE auctions
  SET current_price = p_amount,
      bid_count = bid_count + 1
  WHERE id = p_auction_id;

  -- 15. Return success with updated state
  RETURN jsonb_build_object(
    'success', true,
    'auction_id', p_auction_id,
    'new_current_price', p_amount,
    'new_bid_count', v_auction.bid_count + 1,
    'bid_sequence', v_bid_sequence
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION place_bid(uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION place_bid(uuid, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION place_bid(uuid, bigint) TO authenticated;

-- ============================================================
-- 5. Updated finalize_auction() — supports batch mode (NULL = all expired)
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
    WHERE status = 'live' AND ends_at < now()
    ORDER BY ends_at ASC;
BEGIN
  IF p_auction_id IS NOT NULL THEN
    -- Single auction mode
    SELECT * INTO v_auction
    FROM auctions
    WHERE id = p_auction_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
    END IF;

    IF v_auction.status = 'ended' THEN
      RETURN jsonb_build_object('success', true, 'already_ended', true, 'winner_user_id', v_auction.winner_user_id);
    END IF;

    IF v_auction.status != 'live' THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده در وضعیت نامعتبر است');
    END IF;

    -- Only finalize if end time has passed
    IF now() < v_auction.ends_at THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز به پایان نرسیده است');
    END IF;

    UPDATE auctions SET status = 'ended' WHERE id = p_auction_id;

    SELECT * INTO v_winning_bid
    FROM bids
    WHERE auction_id = p_auction_id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    IF FOUND THEN
      UPDATE bids SET is_winning = true WHERE id = v_winning_bid.id;
      UPDATE auctions
      SET winner_user_id = v_winning_bid.user_id,
          winning_bid_id = v_winning_bid.id
      WHERE id = p_auction_id;

      RETURN jsonb_build_object(
        'success', true,
        'auction_id', p_auction_id,
        'winner_user_id', v_winning_bid.user_id,
        'winning_bid_id', v_winning_bid.id,
        'winning_amount', v_winning_bid.amount
      );
    ELSE
      RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id, 'no_bids', true);
    END IF;
  ELSE
    -- Batch mode: finalize all expired live auctions
    FOR v_auction_id IN v_cursor LOOP
      SELECT * INTO v_auction
      FROM auctions
      WHERE id = v_auction_id
      FOR UPDATE;

      IF v_auction.status != 'live' THEN
        CONTINUE;
      END IF;

      UPDATE auctions SET status = 'ended' WHERE id = v_auction_id;

      SELECT * INTO v_winning_bid
      FROM bids
      WHERE auction_id = v_auction_id
      ORDER BY amount DESC, created_at ASC
      LIMIT 1;

      IF FOUND THEN
        UPDATE bids SET is_winning = true WHERE id = v_winning_bid.id;
        UPDATE auctions
        SET winner_user_id = v_winning_bid.user_id,
            winning_bid_id = v_winning_bid.id
        WHERE id = v_auction_id;

        v_results := array_append(v_results, jsonb_build_object(
          'success', true,
          'auction_id', v_auction_id,
          'winner_user_id', v_winning_bid.user_id,
          'winning_amount', v_winning_bid.amount
        ));
      ELSE
        v_results := array_append(v_results, jsonb_build_object(
          'success', true,
          'auction_id', v_auction_id,
          'no_bids', true
        ));
      END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'finalized', to_jsonb(v_results));
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM anon, authenticated;
