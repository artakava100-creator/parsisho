/*
# Business Management System Overhaul

## Summary
1. Business category admin management (CRUD + reorder)
2. Unified site-wide search across products, businesses, and auctions
3. User business registration with Parsi wallet fee deduction
4. Business subscription columns (subscription_type, subscription_expires_at)
5. Site settings for configurable fees (stored as jsonb values)

## New Columns on `businesses`
- `subscription_type` text NOT NULL DEFAULT 'free' CHECK in ('free','featured')
- `subscription_expires_at` timestamptz nullable

## New RPCs
- admin_create_business_category, admin_update_business_category, admin_delete_business_category, admin_reorder_business_categories
- site_search (public, searches products + businesses + auctions)
- user_register_business (wallet fee deduction, creates pending business)
- user_upgrade_business_featured (wallet fee deduction, upgrades to featured)
- user_get_my_businesses, user_update_my_business
- user_list_my_business_images, user_add_my_business_image, user_delete_my_business_image
- get_site_setting_int helper

## Security
- Admin RPCs: SECURITY DEFINER, is_admin() guard
- User RPCs: SECURITY DEFINER, auth.uid() ownership + wallet balance check
- RLS: owner SELECT/UPDATE on businesses, owner SELECT/INSERT/DELETE on business_images
- EXECUTE revoked from anon on admin + user functions; granted to authenticated on user functions
- site_search granted to anon + authenticated (public search)
*/

-- ─── 1. Add subscription columns to businesses ───────────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'free'
    CHECK (subscription_type IN ('free', 'featured'));

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- ─── 2. Seed business fee settings (jsonb values) ───────────────────
INSERT INTO site_settings (key, value, updated_at)
VALUES
  ('business_registration_fee', '1000'::jsonb, now()),
  ('business_featured_upgrade_fee', '5000'::jsonb, now()),
  ('business_subscription_duration_days', '30'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

-- ─── 3. Helper: get site setting as integer ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_site_setting_int(p_key text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((value #>> '{}')::bigint, 0) FROM site_settings WHERE key = p_key LIMIT 1;
$$;

-- ─── 4. Business Category Management RPCs ───────────────────────────

CREATE OR REPLACE FUNCTION public.admin_create_business_category(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_icon_name text DEFAULT NULL,
  p_display_order integer DEFAULT 0,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه این عملیات را ندارید');
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'نام دسته‌بندی الزامی است');
  END IF;

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'نامک الزامی است');
  END IF;

  BEGIN
    INSERT INTO business_categories (name, slug, description, icon_name, display_order, is_active)
    VALUES (trim(p_name), lower(trim(p_slug)), p_description, p_icon_name, p_display_order, p_is_active)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true, 'category_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_business_category(
  p_category_id uuid,
  p_name text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_icon_name text DEFAULT NULL,
  p_display_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه این عملیات را ندارید');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE id = p_category_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسته‌بندی پیدا نشد');
  END IF;

  BEGIN
    UPDATE business_categories SET
      name = COALESCE(NULLIF(trim(p_name), ''), name),
      slug = CASE WHEN p_slug IS NOT NULL AND trim(p_slug) <> '' THEN lower(trim(p_slug)) ELSE slug END,
      description = COALESCE(p_description, description),
      icon_name = COALESCE(p_icon_name, icon_name),
      display_order = COALESCE(p_display_order, display_order),
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
    WHERE id = p_category_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_business_category(p_category_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه این عملیات را ندارید');
  END IF;

  IF EXISTS (SELECT 1 FROM businesses WHERE category_id = p_category_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'این دسته‌بندی دارای کسب‌وکار است و قابل حذف نیست');
  END IF;

  DELETE FROM business_categories WHERE id = p_category_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسته‌بندی پیدا نشد');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_business_categories(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_id text;
  v_order integer;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه این عملیات را ندارید');
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    v_id := v_item->>'id';
    v_order := (v_item->>'display_order')::integer;
    UPDATE business_categories SET display_order = v_order, updated_at = now() WHERE id = v_id::uuid;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 5. Unified Site Search RPC ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.site_search(p_query text, p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_products jsonb;
  v_businesses jsonb;
  v_auctions jsonb;
  v_products_total integer;
  v_businesses_total integer;
  v_auctions_total integer;
  v_search text;
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN jsonb_build_object('success', true, 'products', '[]'::jsonb, 'businesses', '[]'::jsonb, 'auctions', '[]'::jsonb, 'totals', jsonb_build_object('products', 0, 'businesses', 0, 'auctions', 0));
  END IF;

  v_search := trim(p_query);

  -- Products
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_products
  FROM (
    SELECT p.id, p.name, p.slug, p.short_description,
           COALESCE(pm.url, '') AS image_url,
           COALESCE(pp.amount, 0) AS price,
           c.name AS category_name,
           c.slug AS category_slug
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT url FROM product_media
      WHERE product_id = p.id AND media_type = 'image'
      ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    LEFT JOIN LATERAL (
      SELECT amount FROM product_prices
      WHERE product_id = p.id AND price_type = 'base' AND is_active = true
      ORDER BY created_at DESC LIMIT 1
    ) pp ON true
    WHERE p.is_published = true AND p.is_active = true
      AND (p.name ILIKE '%' || v_search || '%'
           OR p.short_description ILIKE '%' || v_search || '%'
           OR p.sku ILIKE '%' || v_search || '%')
    ORDER BY p.is_best_seller DESC, p.created_at DESC
    LIMIT p_limit
  ) t;

  SELECT count(*) INTO v_products_total
  FROM products p
  WHERE p.is_published = true AND p.is_active = true
    AND (p.name ILIKE '%' || v_search || '%'
         OR p.short_description ILIKE '%' || v_search || '%'
         OR p.sku ILIKE '%' || v_search || '%');

  -- Businesses
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_businesses
  FROM (
    SELECT b.id, b.name, b.slug, b.short_description,
           b.logo_path, b.cover_path, b.city, b.is_featured,
           c.name AS category_name, c.slug AS category_slug
    FROM businesses b
    JOIN business_categories c ON c.id = b.category_id
    WHERE b.status = 'active'
      AND (b.name ILIKE '%' || v_search || '%'
           OR b.short_description ILIKE '%' || v_search || '%'
           OR b.city ILIKE '%' || v_search || '%')
    ORDER BY b.is_featured DESC, b.created_at DESC
    LIMIT p_limit
  ) t;

  SELECT count(*) INTO v_businesses_total
  FROM businesses b
  WHERE b.status = 'active'
    AND (b.name ILIKE '%' || v_search || '%'
         OR b.short_description ILIKE '%' || v_search || '%'
         OR b.city ILIKE '%' || v_search || '%');

  -- Auctions
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_auctions
  FROM (
    SELECT a.id, a.title, a.slug, a.image_url, a.current_price,
           a.status, a.ends_at, a.is_official, a.product_name
    FROM auctions a
    WHERE a.status IN ('live', 'ending', 'scheduled')
      AND (a.title ILIKE '%' || v_search || '%'
           OR a.product_name ILIKE '%' || v_search || '%'
           OR a.description ILIKE '%' || v_search || '%')
    ORDER BY a.is_official DESC, a.ends_at ASC
    LIMIT p_limit
  ) t;

  SELECT count(*) INTO v_auctions_total
  FROM auctions a
  WHERE a.status IN ('live', 'ending', 'scheduled')
    AND (a.title ILIKE '%' || v_search || '%'
         OR a.product_name ILIKE '%' || v_search || '%'
         OR a.description ILIKE '%' || v_search || '%');

  RETURN jsonb_build_object(
    'success', true,
    'products', v_products,
    'businesses', v_businesses,
    'auctions', v_auctions,
    'totals', jsonb_build_object(
      'products', v_products_total,
      'businesses', v_businesses_total,
      'auctions', v_auctions_total
    )
  );
END;
$$;

-- ─── 6. User Business Registration with Wallet Deduction ────────────

CREATE OR REPLACE FUNCTION public.user_register_business(
  p_name text,
  p_slug text,
  p_category_id uuid,
  p_short_description text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_locality text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_logo_path text DEFAULT NULL,
  p_cover_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_fee bigint;
  v_wallet wallets%ROWTYPE;
  v_new_balance bigint;
  v_business_id uuid;
  v_duration_days integer;
  v_expires_at timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای ثبت کسب‌وکار باید وارد حساب خود شوید');
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'نام کسب‌وکار الزامی است');
  END IF;

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'نامک (slug) الزامی است');
  END IF;

  IF p_category_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسته‌بندی الزامی است');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE id = p_category_id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسته‌بندی انتخاب شده معتبر نیست');
  END IF;

  v_fee := get_site_setting_int('business_registration_fee');
  v_duration_days := COALESCE(get_site_setting_int('business_subscription_duration_days')::integer, 30);
  v_expires_at := now() + (v_duration_days || ' days')::interval;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_user_id FOR UPDATE;
  END IF;

  IF v_wallet.available_balance < v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'موجودی کیف پول کافی نیست. هزینه ثبت: ' || v_fee::text || ' پارسی');
  END IF;

  v_new_balance := v_wallet.available_balance - v_fee;
  UPDATE wallets SET available_balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (v_user_id, 'business_registration', v_fee, v_new_balance, 'هزینه ثبت کسب‌وکار: ' || trim(p_name));

  BEGIN
    INSERT INTO businesses (
      owner_id, name, slug, category_id,
      short_description, description,
      city, locality, address, phone, website,
      logo_path, cover_path,
      status, subscription_type, subscription_expires_at
    ) VALUES (
      v_user_id, trim(p_name), lower(trim(p_slug)), p_category_id,
      p_short_description, p_description,
      p_city, p_locality, p_address, p_phone, p_website,
      p_logo_path, p_cover_path,
      'pending', 'free', v_expires_at
    )
    RETURNING id INTO v_business_id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE wallets SET available_balance = available_balance + v_fee, updated_at = now() WHERE user_id = v_user_id;
    INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
    VALUES (v_user_id, 'refund', v_fee, v_wallet.available_balance, 'بازگشت وجه - نامک تکراری');
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true, 'business_id', v_business_id, 'fee_paid', v_fee, 'new_balance', v_new_balance);
END;
$$;

-- ─── 7. User Upgrade Business to Featured ───────────────────────────

CREATE OR REPLACE FUNCTION public.user_upgrade_business_featured(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_fee bigint;
  v_wallet wallets%ROWTYPE;
  v_new_balance bigint;
  v_duration_days integer;
  v_expires_at timestamptz;
  v_business businesses%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای این عملیات باید وارد حساب خود شوید');
  END IF;

  SELECT * INTO v_business FROM businesses WHERE id = p_business_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'کسب‌وکار پیدا نشد');
  END IF;

  IF v_business.owner_id IS NULL OR v_business.owner_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما مالک این کسب‌وکار نیستید');
  END IF;

  IF v_business.subscription_type = 'featured' AND v_business.subscription_expires_at IS NOT NULL AND v_business.subscription_expires_at > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'این کسب‌وکار در حال حاضر ویژه است');
  END IF;

  v_fee := get_site_setting_int('business_featured_upgrade_fee');
  v_duration_days := COALESCE(get_site_setting_int('business_subscription_duration_days')::integer, 30);
  v_expires_at := now() + (v_duration_days || ' days')::interval;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_user_id FOR UPDATE;
  END IF;

  IF v_wallet.available_balance < v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'موجودی کیف پول کافی نیست. هزینه ارتقا: ' || v_fee::text || ' پارسی');
  END IF;

  v_new_balance := v_wallet.available_balance - v_fee;
  UPDATE wallets SET available_balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (v_user_id, 'business_featured_upgrade', v_fee, v_new_balance, 'ارتقای کسب‌وکار به ویژه: ' || v_business.name);

  UPDATE businesses SET
    subscription_type = 'featured',
    subscription_expires_at = v_expires_at,
    is_featured = true,
    updated_at = now()
  WHERE id = p_business_id;

  RETURN jsonb_build_object('success', true, 'fee_paid', v_fee, 'new_balance', v_new_balance, 'expires_at', v_expires_at);
END;
$$;

-- ─── 8. User Get My Businesses ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_get_my_businesses()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'باید وارد حساب خود شوید');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'businesses', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT b.id, b.name, b.slug, b.short_description,
               b.category_id, c.name AS category_name, c.slug AS category_slug,
               b.city, b.locality, b.logo_path, b.cover_path,
               b.status, b.is_featured,
               b.subscription_type, b.subscription_expires_at,
               b.start_date, b.end_date,
               b.created_at
        FROM businesses b
        JOIN business_categories c ON c.id = b.category_id
        WHERE b.owner_id = v_user_id
        ORDER BY b.created_at DESC
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

-- ─── 9. User Update My Business ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_update_my_business(
  p_business_id uuid,
  p_name text DEFAULT NULL,
  p_short_description text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_locality text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_logo_path text DEFAULT NULL,
  p_cover_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_business businesses%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'باید وارد حساب خود شوید');
  END IF;

  SELECT * INTO v_business FROM businesses WHERE id = p_business_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'کسب‌وکار پیدا نشد');
  END IF;

  IF v_business.owner_id IS NULL OR v_business.owner_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما مالک این کسب‌وکار نیستید');
  END IF;

  UPDATE businesses SET
    name = COALESCE(NULLIF(trim(p_name), ''), name),
    short_description = COALESCE(p_short_description, short_description),
    description = COALESCE(p_description, description),
    city = COALESCE(p_city, city),
    locality = COALESCE(p_locality, locality),
    address = COALESCE(p_address, address),
    phone = COALESCE(p_phone, phone),
    website = COALESCE(p_website, website),
    logo_path = COALESCE(p_logo_path, logo_path),
    cover_path = COALESCE(p_cover_path, cover_path),
    updated_at = now()
  WHERE id = p_business_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 10. User Business Image Management ─────────────────────────────

CREATE OR REPLACE FUNCTION public.user_list_my_business_images(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'باید وارد حساب خود شوید');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'کسب‌وکار پیدا نشد یا متعلق به شما نیست');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'images', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, image_path, sort_order
        FROM business_images
        WHERE business_id = p_business_id
        ORDER BY sort_order ASC, created_at ASC
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_add_my_business_image(p_business_id uuid, p_image_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_image_id uuid;
  v_next_order integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'باید وارد حساب خود شوید');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'کسب‌وکار پیدا نشد یا متعلق به شما نیست');
  END IF;

  IF p_image_path IS NULL OR trim(p_image_path) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'مسیر تصویر الزامی است');
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_next_order FROM business_images WHERE business_id = p_business_id;

  INSERT INTO business_images (business_id, image_path, sort_order)
  VALUES (p_business_id, p_image_path, v_next_order)
  RETURNING id INTO v_image_id;

  RETURN jsonb_build_object('success', true, 'image_id', v_image_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_delete_my_business_image(p_image_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_image business_images%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'باید وارد حساب خود شوید');
  END IF;

  SELECT * INTO v_image FROM business_images WHERE id = p_image_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'تصویر پیدا نشد');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_image.business_id AND owner_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'این تصویر متعلق به کسب‌وکار شما نیست');
  END IF;

  DELETE FROM business_images WHERE id = p_image_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 11. RLS: Owner can SELECT and UPDATE their own businesses ──────

DROP POLICY IF EXISTS "owner_select_businesses" ON businesses;
CREATE POLICY "owner_select_businesses"
ON businesses FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_update_businesses" ON businesses;
CREATE POLICY "owner_update_businesses"
ON businesses FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ─── 12. RLS: Owner can manage their own business images ────────────

DROP POLICY IF EXISTS "owner_select_business_images" ON business_images;
CREATE POLICY "owner_select_business_images"
ON business_images FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_images.business_id AND b.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owner_insert_business_images" ON business_images;
CREATE POLICY "owner_insert_business_images"
ON business_images FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_images.business_id AND b.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owner_delete_business_images" ON business_images;
CREATE POLICY "owner_delete_business_images"
ON business_images FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_images.business_id AND b.owner_id = auth.uid()
  )
);

-- ─── 13. Revoke/grant EXECUTE ───────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.admin_create_business_category(text, text, text, text, integer, boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_business_category(uuid, text, text, text, text, integer, boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_business_category(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_business_categories(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_site_setting_int(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_register_business(text, text, uuid, text, text, text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_upgrade_business_featured(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_get_my_businesses() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_update_my_business(uuid, text, text, text, text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_list_my_business_images(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_add_my_business_image(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_delete_my_business_image(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.user_register_business(text, text, uuid, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_upgrade_business_featured(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_get_my_businesses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_update_my_business(uuid, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_list_my_business_images(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_add_my_business_image(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_delete_my_business_image(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.site_search(text, integer) TO anon, authenticated;
