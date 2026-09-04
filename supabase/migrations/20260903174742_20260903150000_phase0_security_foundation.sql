-- ============================================================
-- Phase 0 — Security Foundation
-- 1. Fix search_path on trigger functions
-- 2. Create create_store_order RPC (server-authoritative checkout)
-- 3. Create admin_update_store_settings RPC
-- 4. Harden track_ad_event with validation
-- 5. Revoke direct DML on store_orders, store_order_items
-- 6. Revoke direct UPDATE on store_settings
-- 7. Narrow ad table privileges
-- 8. Drop UPDATE/DELETE policies on store_orders, store_order_items
-- 9. Grant EXECUTE on new RPCs
-- ============================================================

-- ============================================================
-- 1. Fix search_path on trigger functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_store_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_store_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Create create_store_order RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_store_order(
  p_customer_name text,
  p_mobile_number text,
  p_province text,
  p_city text,
  p_address text,
  p_postal_code text,
  p_delivery_note text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_shipping_cost integer := 0;
  v_payment_fee integer := 0;
  v_total integer := 0;
  v_settings record;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_product_name text;
  v_product_image text;
  v_unit_price integer;
  v_item_subtotal integer;
  v_inventory_id uuid;
  v_price_amount bigint;
  v_available integer;
  v_allow_backorder boolean;
  v_ts text;
  v_rand text;
  v_count integer;
  v_idx integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'احراز هویت لازم است');
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'سبد خرید خالی است');
  END IF;

  IF p_customer_name IS NULL OR length(p_customer_name) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'نام و نام خانوادگی را کامل وارد کنید');
  END IF;
  IF p_mobile_number IS NULL OR length(p_mobile_number) < 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'شماره موبایل نامعتبر است');
  END IF;
  IF p_province IS NULL OR length(p_province) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'استان را انتخاب کنید');
  END IF;
  IF p_city IS NULL OR length(p_city) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'نام شهر را وارد کنید');
  END IF;
  IF p_address IS NULL OR length(p_address) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'آدرس کامل را وارد کنید');
  END IF;
  IF p_postal_code IS NULL OR length(p_postal_code) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'کد پستی نامعتبر است');
  END IF;

  SELECT * INTO v_settings FROM public.store_settings WHERE id = 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'تنظیمات فروشگاه یافت نشد');
  END IF;

  IF v_settings.shipping_mode = 'provider' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ارائه‌دهنده ارسال پیکربندی نشده است');
  END IF;

  CREATE TEMP TABLE _order_items (
    product_id uuid,
    product_name text,
    product_image text,
    unit_price integer,
    quantity integer,
    item_subtotal integer,
    inventory_id uuid
  ) ON COMMIT DROP;

  v_count := jsonb_array_length(p_items);

  FOR v_idx IN 0..v_count - 1 LOOP
    v_item := p_items->v_idx;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'تعداد محصول نامعتبر است');
    END IF;

    SELECT name INTO v_product_name FROM public.products
    WHERE id = v_product_id
      AND is_published = true
      AND is_active = true
      AND status = 'published';

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'محصول یافت نشد یا در دسترس نیست');
    END IF;

    SELECT amount INTO v_price_amount FROM public.product_prices
    WHERE product_id = v_product_id
      AND variant_id IS NULL
      AND is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
    ORDER BY
      CASE WHEN price_type = 'sale' THEN 0 ELSE 1 END,
      created_at DESC
    LIMIT 1;

    IF v_price_amount IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'قیمت محصول یافت نشد');
    END IF;

    v_unit_price := v_price_amount::integer;
    v_item_subtotal := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_item_subtotal;

    SELECT url INTO v_product_image FROM public.product_media
    WHERE product_id = v_product_id
    ORDER BY is_primary DESC, sort_order ASC
    LIMIT 1;

    SELECT id, (stock_quantity - reserved_quantity), allow_backorder
      INTO v_inventory_id, v_available, v_allow_backorder
    FROM public.product_inventory
    WHERE product_id = v_product_id
      AND variant_id IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'موجودی محصول بررسی نشد');
    END IF;

    IF v_available < v_quantity AND NOT v_allow_backorder THEN
      RETURN jsonb_build_object('success', false, 'error',
        'موجودی کافی نیست: ' || v_product_name);
    END IF;

    INSERT INTO _order_items VALUES (
      v_product_id, v_product_name, v_product_image,
      v_unit_price, v_quantity, v_item_subtotal, v_inventory_id
    );
  END LOOP;

  IF v_settings.shipping_mode = 'free' THEN
    v_shipping_cost := 0;
  ELSIF v_settings.shipping_mode = 'fixed' THEN
    v_shipping_cost := v_settings.fixed_shipping_fee;
  ELSE
    v_shipping_cost := 0;
  END IF;

  v_discount := 0;
  IF v_settings.payment_fee_type = 'none' THEN
    v_payment_fee := 0;
  ELSIF v_settings.payment_fee_type = 'percentage' THEN
    v_payment_fee := round((v_subtotal - v_discount) * v_settings.payment_fee_percentage / 100);
  ELSIF v_settings.payment_fee_type = 'fixed' THEN
    v_payment_fee := v_settings.payment_fee_fixed_amount;
  ELSIF v_settings.payment_fee_type = 'combined' THEN
    v_payment_fee := round((v_subtotal - v_discount) * v_settings.payment_fee_percentage / 100)
      + v_settings.payment_fee_fixed_amount;
  ELSE
    v_payment_fee := 0;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount + v_shipping_cost + v_payment_fee);

  v_ts := extract(epoch from now())::bigint::text;
  v_ts := substring(v_ts from greatest(1, length(v_ts) - 7));
  v_rand := lpad(floor(random() * 10000)::text, 4, '0');
  v_order_number := 'PS-' || v_ts || v_rand;

  INSERT INTO public.store_orders (
    user_id, order_number, status, subtotal, discount, shipping_cost,
    payment_fee, total, customer_name, mobile_number,
    province, city, address, postal_code, delivery_note, payment_status
  ) VALUES (
    v_user_id, v_order_number, 'pending', v_subtotal, v_discount, v_shipping_cost,
    v_payment_fee, v_total, p_customer_name, p_mobile_number,
    p_province, p_city, p_address, p_postal_code, p_delivery_note, 'unpaid'
  ) RETURNING id INTO v_order_id;

  FOR v_idx IN 0..v_count - 1 LOOP
    v_item := p_items->v_idx;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT product_name, product_image, unit_price, item_subtotal, inventory_id
      INTO v_product_name, v_product_image, v_unit_price, v_item_subtotal, v_inventory_id
    FROM _order_items
    WHERE product_id = v_product_id AND quantity = v_quantity;

    INSERT INTO public.store_order_items (
      order_id, product_id, product_name, product_image,
      unit_price, quantity, subtotal
    ) VALUES (
      v_order_id, v_product_id::text, v_product_name, v_product_image,
      v_unit_price, v_quantity, v_item_subtotal
    );

    UPDATE public.product_inventory
    SET reserved_quantity = reserved_quantity + v_quantity
    WHERE id = v_inventory_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order_id,
      'order_number', v_order_number,
      'status', 'pending',
      'subtotal', v_subtotal,
      'discount', v_discount,
      'shipping_cost', v_shipping_cost,
      'payment_fee', v_payment_fee,
      'total', v_total,
      'payment_status', 'unpaid',
      'created_at', now()
    )
  );
END;
$$;

-- ============================================================
-- 3. Create admin_update_store_settings RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_store_settings(
  p_shipping_mode text,
  p_fixed_shipping_fee integer,
  p_shipping_provider text,
  p_payment_fee_type text,
  p_payment_fee_percentage numeric,
  p_payment_fee_fixed_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_role text;
BEGIN
  SELECT role INTO v_requester_role FROM public.profiles WHERE id = auth.uid();
  IF v_requester_role IS NULL OR v_requester_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  UPDATE public.store_settings SET
    shipping_mode = p_shipping_mode,
    fixed_shipping_fee = p_fixed_shipping_fee,
    shipping_provider = p_shipping_provider,
    payment_fee_type = p_payment_fee_type,
    payment_fee_percentage = p_payment_fee_percentage,
    payment_fee_fixed_amount = p_payment_fee_fixed_amount,
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 4. Harden track_ad_event — DROP first (old version has default param)
-- ============================================================

DROP FUNCTION IF EXISTS public.track_ad_event(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.track_ad_event(
  p_advertisement_id uuid,
  p_ad_slot_id uuid,
  p_event_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad_count integer;
  v_slot_count integer;
  v_assignment_count integer;
BEGIN
  IF p_event_type NOT IN ('impression', 'click') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع رویداد نامعتبر است');
  END IF;

  SELECT count(*) INTO v_ad_count FROM public.advertisements
  WHERE id = p_advertisement_id AND is_active = true;

  IF v_ad_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'تبلیغ یافت نشد');
  END IF;

  SELECT count(*) INTO v_slot_count FROM public.ad_slots
  WHERE id = p_ad_slot_id AND is_active = true;

  IF v_slot_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'موقعیت تبلیغ یافت نشد');
  END IF;

  SELECT count(*) INTO v_assignment_count FROM public.ad_assignments
  WHERE advertisement_id = p_advertisement_id AND ad_slot_id = p_ad_slot_id;

  IF v_assignment_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'تبلیغ به این موقعیت اختصاص ندارد');
  END IF;

  INSERT INTO public.ad_events (advertisement_id, ad_slot_id, event_type, user_id)
  VALUES (p_advertisement_id, p_ad_slot_id, p_event_type, auth.uid());

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 5. Revoke direct DML on store_orders, store_order_items
-- ============================================================

REVOKE INSERT, UPDATE, DELETE ON public.store_orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.store_order_items FROM anon, authenticated;
GRANT SELECT ON public.store_orders TO authenticated;
GRANT SELECT ON public.store_order_items TO authenticated;

-- ============================================================
-- 6. Revoke direct UPDATE on store_settings
-- ============================================================

REVOKE INSERT, UPDATE, DELETE ON public.store_settings FROM anon, authenticated;
GRANT SELECT ON public.store_settings TO authenticated;

-- ============================================================
-- 7. Narrow ad table privileges
-- ============================================================

REVOKE ALL ON public.ad_slots FROM anon, authenticated;
REVOKE ALL ON public.advertisements FROM anon, authenticated;
REVOKE ALL ON public.ad_assignments FROM anon, authenticated;
REVOKE ALL ON public.ad_events FROM anon, authenticated;

GRANT SELECT ON public.ad_slots TO anon, authenticated;
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT SELECT ON public.ad_assignments TO anon, authenticated;

-- ============================================================
-- 8. Drop UPDATE/DELETE/INSERT policies on store_orders, store_order_items
-- ============================================================

DROP POLICY IF EXISTS "update_own_store_orders" ON public.store_orders;
DROP POLICY IF EXISTS "delete_own_store_orders" ON public.store_orders;
DROP POLICY IF EXISTS "update_own_store_order_items" ON public.store_order_items;
DROP POLICY IF EXISTS "delete_own_store_order_items" ON public.store_order_items;
DROP POLICY IF EXISTS "insert_own_store_orders" ON public.store_orders;
DROP POLICY IF EXISTS "insert_own_store_order_items" ON public.store_order_items;

-- ============================================================
-- 9. Grant EXECUTE on new RPCs
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.create_store_order(text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_store_order(text, text, text, text, text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_store_order(text, text, text, text, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_store_settings(text, integer, text, text, numeric, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_store_settings(text, integer, text, text, numeric, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_store_settings(text, integer, text, text, numeric, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.track_ad_event(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_ad_event(uuid, uuid, text) TO anon, authenticated;