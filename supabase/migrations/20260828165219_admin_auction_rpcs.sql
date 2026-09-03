/*
# Phase 3 Final Gate: Admin auction management RPCs

Secure, server-side RPCs for admin auction management. All functions verify
the caller's role before performing any operation.

Functions:
- is_admin(): internal helper, returns true if caller is admin/super_admin
- create_auction(): creates draft auction (admin only)
- update_auction(): updates draft auction editable fields (admin only)
- set_auction_scheduled(): draft → scheduled (admin only)
- set_auction_live(): scheduled → live (admin only)
- cancel_auction(): draft/scheduled/live → cancelled (admin only)

Security:
- All SECURITY DEFINER with SET search_path = public
- Role check via profiles table join with auth.uid()
- Execute granted to authenticated only (role check happens inside)
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC;

CREATE OR REPLACE FUNCTION create_auction(
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
  p_product_name text DEFAULT NULL
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
    INSERT INTO auctions (
      title, slug, description, status, auction_date,
      starts_at, ends_at, starting_price, current_price,
      min_bid_increment, is_official, image_url, product_name
    )
    VALUES (
      p_title, p_slug, p_description, 'draft', p_auction_date,
      p_starts_at, p_ends_at, p_starting_price, p_starting_price,
      p_min_bid_increment, p_is_official, p_image_url, p_product_name
    )
    RETURNING id INTO v_auction_id;

    RETURN jsonb_build_object('success', true, 'auction_id', v_auction_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'این شناسه یا تاریخ مزایده قبلاً ثبت شده است');
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_auction FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_auction FROM anon;
GRANT EXECUTE ON FUNCTION create_auction TO authenticated;

CREATE OR REPLACE FUNCTION update_auction(
  p_auction_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_product_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ویرایش مزایده ندارید');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  IF v_auction.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط مزایده‌های پیش‌نویس قابل ویرایش هستند');
  END IF;

  UPDATE auctions SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    image_url = COALESCE(p_image_url, image_url),
    product_name = COALESCE(p_product_name, product_name)
  WHERE id = p_auction_id;

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION update_auction FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_auction FROM anon;
GRANT EXECUTE ON FUNCTION update_auction TO authenticated;

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

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION set_auction_scheduled FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_auction_scheduled FROM anon;
GRANT EXECUTE ON FUNCTION set_auction_scheduled TO authenticated;

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

  UPDATE auctions SET status = 'live' WHERE id = p_auction_id;

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION set_auction_live FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_auction_live FROM anon;
GRANT EXECUTE ON FUNCTION set_auction_live TO authenticated;

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

  IF v_auction.status NOT IN ('scheduled', 'live', 'draft') THEN
    RETURN jsonb_build_object('success', false, 'error', 'این مزایده قابل لغو نیست');
  END IF;

  UPDATE auctions SET status = 'cancelled' WHERE id = p_auction_id;

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_auction FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cancel_auction FROM anon;
GRANT EXECUTE ON FUNCTION cancel_auction TO authenticated;

-- Grant finalize_auction to authenticated (admin check via is_admin inside)
-- Update finalize_auction to add admin check
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

REVOKE EXECUTE ON FUNCTION finalize_auction FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalize_auction FROM anon;
GRANT EXECUTE ON FUNCTION finalize_auction TO authenticated;
