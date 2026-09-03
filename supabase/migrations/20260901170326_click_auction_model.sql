/*
# Click-Based Auction Model Migration

## Overview
Transforms the auction system from a manual bid-based model to a click-based auction model.
Each "click" costs a configured amount (click_cost), increases the auction price by a
configured increment (click_increment), and the LAST valid clicker wins when time expires.

## Changes to `auctions` table
- `original_price` (bigint, nullable) — original retail price of the product
- `click_increment` (bigint, default 100000) — price increase per click
- `click_cost` (bigint, default 100000) — cost charged to user's wallet per click
- `click_count` (integer, default 0) — total clicks

## New RPC: `place_click`
- Replaces `place_bid`. Atomic: locks auction, checks eligibility, deducts click_cost from
  wallet, increments price by click_increment, records click, updates participant count,
  handles one-time +10s extension. All values server-authoritative.

## Modified RPC: `finalize_auction`
- Winner is LAST clicker (most recent), not highest bidder.

## Modified RPC: `get_auction_detail`
- Returns click history, last five clickers, user's click stats.

## Modified RPC: `create_auction`
- Accepts p_original_price, p_click_increment, p_click_cost.

## Modified RPC: `update_auction`
- Accepts p_original_price, p_click_increment, p_click_cost.

## Security
- No RLS changes. place_click is SECURITY DEFINER, authenticated only.
- All financial values are server-authoritative.
*/

-- 1. ADD COLUMNS TO auctions TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auctions' AND column_name = 'original_price') THEN
    ALTER TABLE auctions ADD COLUMN original_price bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auctions' AND column_name = 'click_increment') THEN
    ALTER TABLE auctions ADD COLUMN click_increment bigint NOT NULL DEFAULT 100000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auctions' AND column_name = 'click_cost') THEN
    ALTER TABLE auctions ADD COLUMN click_cost bigint NOT NULL DEFAULT 100000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auctions' AND column_name = 'click_count') THEN
    ALTER TABLE auctions ADD COLUMN click_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE auctions SET click_increment = min_bid_increment WHERE click_increment = 100000 AND min_bid_increment != 100000;
UPDATE auctions SET click_count = bid_count WHERE click_count = 0 AND bid_count > 0;

-- 2. place_click RPC
CREATE OR REPLACE FUNCTION public.place_click(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_email_confirmed timestamptz;
  v_wallet wallets%ROWTYPE;
  v_click_sequence integer;
  v_new_price bigint;
  v_click_id uuid;
  v_seconds_remaining double precision;
  v_extension_applied boolean := false;
  v_old_ends_at timestamptz;
  v_is_new_participant boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده وارد حساب خود شوید');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  IF v_auction.status NOT IN ('live', 'ending') THEN
    IF v_auction.status IN ('draft', 'scheduled') THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز شروع نشده است', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
    ELSIF v_auction.status = 'ended' THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده به پایان رسیده است', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
    ELSIF v_auction.status = 'cancelled' THEN
      RETURN jsonb_build_object('success', false, 'error', 'این مزایده لغو شده است', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'مزایده در وضعیت نامعتبر است', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
  END IF;

  IF now() < v_auction.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز شروع نشده است', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
  END IF;
  IF now() > v_auction.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده به پایان رسیده است', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_profile.account_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'حساب شما در حال حاضر اجازه شرکت در مزایده را ندارد', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
  END IF;

  SELECT email_confirmed_at INTO v_email_confirmed FROM auth.users WHERE id = auth.uid();
  IF v_email_confirmed IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا ایمیل خود را تأیید کنید', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
  END IF;

  IF v_profile.phone_verified_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا شماره موبایل خود را تأیید کنید', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count);
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_wallet.available_balance < v_auction.click_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'موجودی پارسی شما برای این کلیک کافی نیست', 'current_price', v_auction.current_price, 'click_count', v_auction.click_count, 'click_cost', v_auction.click_cost);
  END IF;

  SELECT EXISTS(SELECT 1 FROM bids WHERE auction_id = p_auction_id AND user_id = auth.uid()) INTO v_is_new_participant;

  v_new_price := v_auction.current_price + v_auction.click_increment;
  SELECT COALESCE(MAX(bid_sequence), 0) + 1 INTO v_click_sequence FROM bids WHERE auction_id = p_auction_id;

  INSERT INTO bids (auction_id, user_id, amount, bid_sequence)
  VALUES (p_auction_id, auth.uid(), v_new_price, v_click_sequence)
  RETURNING id INTO v_click_id;

  UPDATE wallets SET available_balance = available_balance - v_auction.click_cost WHERE user_id = auth.uid();
  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (auth.uid(), 'auction_click', v_auction.click_cost, v_wallet.available_balance - v_auction.click_cost, 'هزینه کلیک در مزایده: ' || v_auction.title);

  UPDATE auctions
  SET current_price = v_new_price,
      click_count = click_count + 1,
      bid_count = click_count + 1,
      participant_count = CASE WHEN v_is_new_participant THEN participant_count ELSE participant_count + 1 END
  WHERE id = p_auction_id;

  PERFORM log_auction_event(p_auction_id, 'click_accepted', auth.uid(),
    jsonb_build_object('click_id', v_click_id, 'new_price', v_new_price, 'click_sequence', v_click_sequence, 'click_cost', v_auction.click_cost));

  v_seconds_remaining := EXTRACT(EPOCH FROM (v_auction.ends_at - now()));
  IF v_seconds_remaining <= 10 AND v_seconds_remaining >= 0 AND NOT v_auction.extension_used THEN
    v_old_ends_at := v_auction.ends_at;
    v_extension_applied := true;
    UPDATE auctions
    SET ends_at = ends_at + interval '10 seconds',
        extension_used = true,
        extension_triggered_at = now(),
        extension_triggered_by_bid = v_click_id,
        original_ends_at = COALESCE(original_ends_at, v_old_ends_at),
        status = 'live'
    WHERE id = p_auction_id;
    PERFORM log_auction_event(p_auction_id, 'extension_triggered', auth.uid(),
      jsonb_build_object('click_id', v_click_id, 'old_ends_at', v_old_ends_at, 'new_ends_at', v_old_ends_at + interval '10 seconds'));
    PERFORM log_auction_event(p_auction_id, 'extension_consumed', auth.uid(),
      jsonb_build_object('click_id', v_click_id));
  END IF;

  v_seconds_remaining := EXTRACT(EPOCH FROM (
    CASE WHEN v_extension_applied THEN v_old_ends_at + interval '10 seconds' ELSE v_auction.ends_at END - now()
  ));
  IF v_seconds_remaining <= 60 AND v_seconds_remaining > 0 AND v_auction.status = 'live' THEN
    UPDATE auctions SET status = 'ending' WHERE id = p_auction_id;
    PERFORM log_auction_event(p_auction_id, 'auction_ending', NULL, jsonb_build_object('seconds_remaining', v_seconds_remaining));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'auction_id', p_auction_id,
    'new_current_price', v_new_price,
    'new_click_count', v_auction.click_count + 1,
    'click_sequence', v_click_sequence,
    'click_cost', v_auction.click_cost,
    'extension_applied', v_extension_applied,
    'new_ends_at', CASE WHEN v_extension_applied THEN v_old_ends_at + interval '10 seconds' ELSE v_auction.ends_at END,
    'new_balance', v_wallet.available_balance - v_auction.click_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_click(uuid) TO authenticated;

-- 3. UPDATE finalize_auction — winner is LAST clicker
CREATE OR REPLACE FUNCTION public.finalize_auction(p_auction_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_winning_click bids%ROWTYPE;
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

    SELECT * INTO v_winning_click FROM bids WHERE auction_id = p_auction_id ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
      UPDATE bids SET is_winning = true WHERE id = v_winning_click.id;
      UPDATE auctions SET winner_user_id = v_winning_click.user_id, winning_bid_id = v_winning_click.id WHERE id = p_auction_id;
      PERFORM log_auction_event(p_auction_id, 'winner_determined', v_winning_click.user_id,
        jsonb_build_object('winning_amount', v_winning_click.amount, 'winning_click_id', v_winning_click.id));

      PERFORM create_auction_notification(v_winning_click.user_id, p_auction_id, 'user_won', 'in_app',
        'شما برنده مزایده شدید! مبلغ نهایی: ' || v_winning_click.amount::text || ' پارسی');

      PERFORM create_auction_notification(b.user_id, p_auction_id, 'user_lost', 'in_app',
        'مزایده به پایان رسید. شما برنده نشدید.', jsonb_build_object('direct_purchase_eligible', true))
      FROM bids b
      WHERE b.auction_id = p_auction_id AND b.user_id != v_winning_click.user_id
      GROUP BY b.user_id;

      RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id,
        'winner_user_id', v_winning_click.user_id, 'winning_click_id', v_winning_click.id,
        'winning_amount', v_winning_click.amount);
    ELSE
      RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id, 'no_clicks', true);
    END IF;
  ELSE
    FOR v_auction_id IN v_cursor LOOP
      SELECT * INTO v_auction FROM auctions WHERE id = v_auction_id FOR UPDATE;
      IF v_auction.status NOT IN ('live', 'ending') THEN CONTINUE; END IF;

      UPDATE auctions SET status = 'ended', actual_end_at = now() WHERE id = v_auction_id;
      PERFORM log_auction_event(v_auction_id, 'auction_ended', NULL, '{}'::jsonb);

      SELECT * INTO v_winning_click FROM bids WHERE auction_id = v_auction_id ORDER BY created_at DESC LIMIT 1;

      IF FOUND THEN
        UPDATE bids SET is_winning = true WHERE id = v_winning_click.id;
        UPDATE auctions SET winner_user_id = v_winning_click.user_id, winning_bid_id = v_winning_click.id WHERE id = v_auction_id;
        PERFORM log_auction_event(v_auction_id, 'winner_determined', v_winning_click.user_id,
          jsonb_build_object('winning_amount', v_winning_click.amount));

        PERFORM create_auction_notification(v_winning_click.user_id, v_auction_id, 'user_won', 'in_app',
          'شما برنده مزایده شدید! مبلغ نهایی: ' || v_winning_click.amount::text || ' پارسی');

        v_results := array_append(v_results, jsonb_build_object('success', true,
          'auction_id', v_auction_id, 'winner_user_id', v_winning_click.user_id,
          'winning_amount', v_winning_click.amount));
      ELSE
        v_results := array_append(v_results, jsonb_build_object('success', true,
          'auction_id', v_auction_id, 'no_clicks', true));
      END IF;
    END LOOP;
    RETURN jsonb_build_object('success', true, 'finalized', to_jsonb(v_results));
  END IF;
END;
$$;

-- 4. UPDATE get_auction_detail — return click data
CREATE OR REPLACE FUNCTION public.get_auction_detail(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_clicks jsonb;
  v_last_five jsonb;
  v_user_click_count integer := 0;
  v_user_total_spent bigint := 0;
  v_user_last_click timestamptz;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'user_id', b.user_id,
    'amount', b.amount,
    'bid_sequence', b.bid_sequence,
    'is_winning', b.is_winning,
    'created_at', b.created_at,
    'bidderName', COALESCE(p.display_name, 'کاربر'),
    'isOwnBid', (b.user_id = auth.uid()),
    'avatar_url', p.avatar_url
  ) ORDER BY b.created_at DESC), '[]'::jsonb) INTO v_clicks
  FROM bids b
  LEFT JOIN profiles p ON p.id = b.user_id
  WHERE b.auction_id = p_auction_id;

  -- Last five unique clickers: use a CTE with row_number
  WITH ranked_clickers AS (
    SELECT b.user_id, MAX(b.created_at) as last_click_at, p.display_name, p.avatar_url,
           ROW_NUMBER() OVER (ORDER BY MAX(b.created_at) DESC) as rn
    FROM bids b
    LEFT JOIN profiles p ON p.id = b.user_id
    WHERE b.auction_id = p_auction_id
    GROUP BY b.user_id, p.display_name, p.avatar_url
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', rc.user_id,
    'display_name', COALESCE(rc.display_name, 'کاربر'),
    'avatar_url', rc.avatar_url,
    'last_click_at', rc.last_click_at,
    'is_own', (rc.user_id = auth.uid())
  )), '[]'::jsonb) INTO v_last_five
  FROM ranked_clickers rc
  WHERE rc.rn <= 5;

  IF auth.uid() IS NOT NULL THEN
    SELECT count(*) INTO v_user_click_count
    FROM bids WHERE auction_id = p_auction_id AND user_id = auth.uid();

    v_user_total_spent := v_user_click_count * v_auction.click_cost;

    SELECT MAX(b.created_at) INTO v_user_last_click
    FROM bids b WHERE b.auction_id = p_auction_id AND b.user_id = auth.uid();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'auction', to_jsonb(v_auction),
    'bids', v_clicks,
    'last_five_clickers', v_last_five,
    'user_click_count', v_user_click_count,
    'user_total_spent', v_user_total_spent,
    'user_last_click', v_user_last_click,
    'server_time', now()::text,
    'iran_time', get_iran_today()
  );
END;
$$;

-- 5. UPDATE create_auction — accept click model params
CREATE OR REPLACE FUNCTION public.create_auction(
  p_title text,
  p_slug text,
  p_auction_date date,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_starting_price bigint,
  p_description text DEFAULT '',
  p_min_bid_increment bigint DEFAULT 100000,
  p_is_official boolean DEFAULT true,
  p_image_url text DEFAULT NULL,
  p_product_name text DEFAULT NULL,
  p_original_price bigint DEFAULT NULL,
  p_click_increment bigint DEFAULT NULL,
  p_click_cost bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  IF p_ends_at <= p_starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'زمان پایان باید بعد از زمان شروع باشد');
  END IF;
  IF p_auction_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'تاریخ مزایده الزامی است');
  END IF;

  BEGIN
    INSERT INTO auctions (
      title, slug, description, status, auction_date,
      starts_at, ends_at, starting_price, current_price,
      min_bid_increment, is_official, image_url, product_name,
      original_price, click_increment, click_cost
    )
    VALUES (
      p_title, p_slug, p_description, 'draft', p_auction_date,
      p_starts_at, p_ends_at, p_starting_price, p_starting_price,
      COALESCE(p_click_increment, p_min_bid_increment), p_is_official, p_image_url, p_product_name,
      p_original_price, COALESCE(p_click_increment, p_min_bid_increment, 100000), COALESCE(p_click_cost, 100000)
    )
    RETURNING id INTO v_auction_id;

    PERFORM log_auction_event(v_auction_id, 'auction_created', auth.uid(), '{}'::jsonb);
    RETURN jsonb_build_object('success', true, 'auction_id', v_auction_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'این شناسه یا تاریخ مزایده قبلاً ثبت شده است');
  END;
END;
$$;

-- 6. UPDATE update_auction — accept click model params
CREATE OR REPLACE FUNCTION public.update_auction(
  p_auction_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_product_name text DEFAULT NULL,
  p_original_price bigint DEFAULT NULL,
  p_click_increment bigint DEFAULT NULL,
  p_click_cost bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ویرایش مزایده ندارید');
  END IF;

  UPDATE auctions SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    image_url = COALESCE(p_image_url, image_url),
    product_name = COALESCE(p_product_name, product_name),
    original_price = COALESCE(p_original_price, original_price),
    click_increment = COALESCE(p_click_increment, click_increment),
    click_cost = COALESCE(p_click_cost, click_cost),
    updated_at = now()
  WHERE id = p_auction_id;

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;
