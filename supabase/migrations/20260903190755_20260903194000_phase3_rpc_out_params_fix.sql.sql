-- Phase 3 RPC fixes: Use output column assignment pattern for TABLE-returning functions
-- Pattern: declare output variables, assign them, RETURN NEXT;

-- admin_create_product
CREATE OR REPLACE FUNCTION public.admin_create_product(
  p_name text, p_slug text, p_category_id uuid,
  p_sku text DEFAULT NULL, p_short_description text DEFAULT NULL,
  p_description text DEFAULT NULL, p_brand_id uuid DEFAULT NULL,
  p_status text DEFAULT 'draft', p_sort_order integer DEFAULT 0
)
RETURNS TABLE(success boolean, error text, product_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_status text := COALESCE(p_status, 'draft');
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized'; product_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_status NOT IN ('draft', 'review') THEN
    success := false; error := 'وضعیت اولیه فقط می‌تواند پیش‌نویس یا بازبینی باشد'; product_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    success := false; error := 'نام محصول الزامی است'; product_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    success := false; error := 'نامک محصول الزامی است'; product_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.products (name, slug, category_id, sku, short_description, description, brand_id, status, sort_order)
  VALUES (trim(p_name), trim(p_slug), p_category_id, p_sku, p_short_description, p_description, p_brand_id, v_status, p_sort_order)
  RETURNING id INTO v_id;

  success := true; error := NULL; product_id := v_id;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_product(text, text, uuid, text, text, text, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_product(text, text, uuid, text, text, text, uuid, text, integer) TO authenticated;

-- admin_update_product
CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_product_id uuid,
  p_name text DEFAULT NULL, p_slug text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL, p_sku text DEFAULT NULL,
  p_short_description text DEFAULT NULL, p_description text DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL, p_sort_order integer DEFAULT NULL,
  p_is_new boolean DEFAULT NULL, p_is_selected boolean DEFAULT NULL,
  p_is_economic boolean DEFAULT NULL, p_is_best_seller boolean DEFAULT NULL,
  p_is_popular boolean DEFAULT NULL, p_is_special_offer boolean DEFAULT NULL,
  p_is_discounted boolean DEFAULT NULL, p_is_active boolean DEFAULT NULL
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.products SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    category_id = COALESCE(p_category_id, category_id),
    sku = COALESCE(p_sku, sku),
    short_description = COALESCE(p_short_description, short_description),
    description = COALESCE(p_description, description),
    brand_id = COALESCE(p_brand_id, brand_id),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_new = COALESCE(p_is_new, is_new),
    is_selected = COALESCE(p_is_selected, is_selected),
    is_economic = COALESCE(p_is_economic, is_economic),
    is_best_seller = COALESCE(p_is_best_seller, is_best_seller),
    is_popular = COALESCE(p_is_popular, is_popular),
    is_special_offer = COALESCE(p_is_special_offer, is_special_offer),
    is_discounted = COALESCE(p_is_discounted, is_discounted),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    success := false; error := 'محصول یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_product(uuid, text, text, uuid, text, text, text, uuid, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_product(uuid, text, text, uuid, text, text, text, uuid, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) TO authenticated;

-- admin_transition_product_status
CREATE OR REPLACE FUNCTION public.admin_transition_product_status(
  p_product_id uuid, p_new_status text
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
  v_publish_at timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT status, publish_at INTO v_current, v_publish_at
  FROM public.products WHERE id = p_product_id;

  IF NOT FOUND THEN
    success := false; error := 'محصول یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT (
    (v_current = 'draft' AND p_new_status = 'review') OR
    (v_current = 'review' AND p_new_status = 'scheduled') OR
    (v_current = 'review' AND p_new_status = 'draft') OR
    (v_current = 'scheduled' AND p_new_status = 'published') OR
    (v_current = 'published' AND p_new_status = 'paused') OR
    (v_current = 'paused' AND p_new_status = 'published') OR
    (v_current = 'published' AND p_new_status = 'archived') OR
    (v_current = 'paused' AND p_new_status = 'archived') OR
    (v_current = 'archived' AND p_new_status = 'draft')
  ) THEN
    success := false; error := 'گذر از وضعیت ' || v_current || ' به ' || p_new_status || ' مجاز نیست';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_new_status = 'scheduled' AND v_publish_at IS NULL THEN
    success := false; error := 'برای زمان‌بندی، تاریخ انتشار را تعیین کنید';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.products SET
    status = p_new_status,
    is_published = (p_new_status = 'published'),
    is_active = (p_new_status IN ('published', 'paused', 'scheduled'))
  WHERE id = p_product_id;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_transition_product_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_transition_product_status(uuid, text) TO authenticated;

-- admin_publish_product
CREATE OR REPLACE FUNCTION public.admin_publish_product(p_product_id uuid)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT status INTO v_current FROM public.products WHERE id = p_product_id;

  IF NOT FOUND THEN
    success := false; error := 'محصول یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_current NOT IN ('scheduled', 'paused') THEN
    success := false; error := 'انتشار فقط از وضعیت زمان‌بندی‌شده یا متوقف‌شده مجاز است';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.products SET
    status = 'published',
    is_published = true,
    is_active = true
  WHERE id = p_product_id;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_publish_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_publish_product(uuid) TO authenticated;

-- admin_set_product_publish_at
CREATE OR REPLACE FUNCTION public.admin_set_product_publish_at(
  p_product_id uuid, p_publish_at timestamptz
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.products SET publish_at = p_publish_at WHERE id = p_product_id;

  IF NOT FOUND THEN
    success := false; error := 'محصول یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_product_publish_at(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_product_publish_at(uuid, timestamptz) TO authenticated;

-- admin_delete_product
CREATE OR REPLACE FUNCTION public.admin_delete_product(p_product_id uuid)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_slug text;
  v_name text;
  v_order_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT status, slug, name INTO v_status, v_slug, v_name
  FROM public.products WHERE id = p_product_id;

  IF NOT FOUND THEN
    success := false; error := 'محصول یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_status <> 'archived' THEN
    success := false; error := 'فقط محصولات بایگانی‌شده قابل حذف هستند';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*) INTO v_order_count
  FROM public.store_order_items
  WHERE product_id = v_slug OR product_id = v_name OR product_id = p_product_id::text;

  IF v_order_count > 0 THEN
    success := false; error := 'این محصول در تاریخچه سفارش‌ها استفاده شده و قابل حذف نیست';
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM public.products WHERE id = p_product_id;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(uuid) TO authenticated;

-- admin_create_category
CREATE OR REPLACE FUNCTION public.admin_create_category(
  p_name text, p_slug text,
  p_parent_id uuid DEFAULT NULL,
  p_short_description text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_sort_order integer DEFAULT 0,
  p_is_active boolean DEFAULT true,
  p_show_on_home boolean DEFAULT true,
  p_show_in_navigation boolean DEFAULT true
)
RETURNS TABLE(success boolean, error text, category_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized'; category_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    success := false; error := 'نام دسته‌بندی الزامی است'; category_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    success := false; error := 'نامک الزامی است'; category_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.product_categories WHERE id = p_parent_id) THEN
      success := false; error := 'دسته‌بندی والد یافت نشد'; category_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.product_categories (
    name, slug, parent_id, short_description, description, icon,
    sort_order, is_active, show_on_home, show_in_navigation
  )
  VALUES (
    trim(p_name), trim(p_slug), p_parent_id, p_short_description, p_description, p_icon,
    p_sort_order, p_is_active, p_show_on_home, p_show_in_navigation
  )
  RETURNING id INTO v_id;

  success := true; error := NULL; category_id := v_id;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_category(text, text, uuid, text, text, text, integer, boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_category(text, text, uuid, text, text, text, integer, boolean, boolean, boolean) TO authenticated;

-- admin_update_category
CREATE OR REPLACE FUNCTION public.admin_update_category(
  p_category_id uuid,
  p_name text DEFAULT NULL, p_slug text DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL,
  p_short_description text DEFAULT NULL, p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_show_on_home boolean DEFAULT NULL,
  p_show_in_navigation boolean DEFAULT NULL,
  p_seo_title text DEFAULT NULL, p_seo_description text DEFAULT NULL
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_parent_id IS NOT NULL THEN
    IF p_parent_id = p_category_id THEN
      success := false; error := 'دسته‌بندی نمی‌تواند والد خودش باشد';
      RETURN NEXT;
      RETURN;
    END IF;
    IF NOT public.check_category_cycle(p_category_id, p_parent_id) THEN
      success := false; error := 'این تنظیم باعث ایجاد چرخه در درخت دسته‌بندی می‌شود';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  UPDATE public.product_categories SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    parent_id = CASE WHEN p_parent_id IS NOT NULL THEN p_parent_id ELSE parent_id END,
    short_description = COALESCE(p_short_description, short_description),
    description = COALESCE(p_description, description),
    icon = COALESCE(p_icon, icon),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active),
    show_on_home = COALESCE(p_show_on_home, show_on_home),
    show_in_navigation = COALESCE(p_show_in_navigation, show_in_navigation),
    seo_title = COALESCE(p_seo_title, seo_title),
    seo_description = COALESCE(p_seo_description, seo_description)
  WHERE id = p_category_id;

  IF NOT FOUND THEN
    success := false; error := 'دسته‌بندی یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_category(uuid, text, text, uuid, text, text, text, integer, boolean, boolean, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_category(uuid, text, text, uuid, text, text, text, integer, boolean, boolean, boolean, text, text) TO authenticated;

-- admin_delete_category
CREATE OR REPLACE FUNCTION public.admin_delete_category(p_category_id uuid)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_children integer;
  v_has_products integer;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*) INTO v_has_children
  FROM public.product_categories WHERE parent_id = p_category_id;

  IF v_has_children > 0 THEN
    success := false; error := 'این دسته‌بندی دارای زیردسته است و قابل حذف نیست';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*) INTO v_has_products
  FROM public.products WHERE category_id = p_category_id;

  IF v_has_products > 0 THEN
    success := false; error := 'این دسته‌بندی دارای محصول است و قابل حذف نیست';
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM public.product_categories WHERE id = p_category_id;

  IF NOT FOUND THEN
    success := false; error := 'دسته‌بندی یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_category(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_category(uuid) TO authenticated;

-- admin_reorder_categories
CREATE OR REPLACE FUNCTION public.admin_reorder_categories(
  p_ordered_ids jsonb
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  FOR item IN SELECT jsonb_array_elements(p_ordered_ids)
  LOOP
    UPDATE public.product_categories
    SET sort_order = (item->>'display_order')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reorder_categories(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reorder_categories(jsonb) TO authenticated;

-- admin_create_brand
CREATE OR REPLACE FUNCTION public.admin_create_brand(
  p_name text, p_slug text,
  p_description text DEFAULT NULL,
  p_sort_order integer DEFAULT 0
)
RETURNS TABLE(success boolean, error text, brand_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized'; brand_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    success := false; error := 'نام برند الزامی است'; brand_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    success := false; error := 'نامک الزامی است'; brand_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.product_brands (name, slug, description, sort_order)
  VALUES (trim(p_name), trim(p_slug), p_description, p_sort_order)
  RETURNING id INTO v_id;

  success := true; error := NULL; brand_id := v_id;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_brand(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_brand(text, text, text, integer) TO authenticated;

-- admin_update_brand
CREATE OR REPLACE FUNCTION public.admin_update_brand(
  p_brand_id uuid,
  p_name text DEFAULT NULL, p_slug text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_sort_order integer DEFAULT NULL
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.product_brands SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    description = COALESCE(p_description, description),
    is_active = COALESCE(p_is_active, is_active),
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_brand_id;

  IF NOT FOUND THEN
    success := false; error := 'برند یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_brand(uuid, text, text, text, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_brand(uuid, text, text, text, boolean, integer) TO authenticated;

-- admin_delete_brand
CREATE OR REPLACE FUNCTION public.admin_delete_brand(p_brand_id uuid)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM public.product_brands WHERE id = p_brand_id;

  IF NOT FOUND THEN
    success := false; error := 'برند یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_brand(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_brand(uuid) TO authenticated;

-- admin_reorder_brands
CREATE OR REPLACE FUNCTION public.admin_reorder_brands(
  p_ordered_ids jsonb
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  FOR item IN SELECT jsonb_array_elements(p_ordered_ids)
  LOOP
    UPDATE public.product_brands
    SET sort_order = (item->>'display_order')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reorder_brands(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reorder_brands(jsonb) TO authenticated;

-- admin_create_attribute_definition
CREATE OR REPLACE FUNCTION public.admin_create_attribute_definition(
  p_name text, p_slug text, p_attribute_type text,
  p_category_id uuid DEFAULT NULL,
  p_options jsonb DEFAULT NULL,
  p_is_filterable boolean DEFAULT false,
  p_is_required boolean DEFAULT false,
  p_sort_order integer DEFAULT 0
)
RETURNS TABLE(success boolean, error text, definition_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized'; definition_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    success := false; error := 'نام ویژگی الزامی است'; definition_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    success := false; error := 'نامک الزامی است'; definition_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_attribute_type NOT IN ('text', 'number', 'boolean', 'select', 'multi_select') THEN
    success := false; error := 'نوع ویژگی نامعتبر است'; definition_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.product_attribute_definitions (
    name, slug, attribute_type, category_id, options,
    is_filterable, is_required, sort_order
  )
  VALUES (
    trim(p_name), trim(p_slug), p_attribute_type, p_category_id, p_options,
    p_is_filterable, p_is_required, p_sort_order
  )
  RETURNING id INTO v_id;

  success := true; error := NULL; definition_id := v_id;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_attribute_definition(text, text, text, uuid, jsonb, boolean, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_attribute_definition(text, text, text, uuid, jsonb, boolean, boolean, integer) TO authenticated;

-- admin_update_attribute_definition
CREATE OR REPLACE FUNCTION public.admin_update_attribute_definition(
  p_definition_id uuid,
  p_name text DEFAULT NULL, p_slug text DEFAULT NULL,
  p_attribute_type text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_options jsonb DEFAULT NULL,
  p_is_filterable boolean DEFAULT NULL,
  p_is_required boolean DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_sort_order integer DEFAULT NULL
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.product_attribute_definitions SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    attribute_type = COALESCE(p_attribute_type, attribute_type),
    category_id = COALESCE(p_category_id, category_id),
    options = COALESCE(p_options, options),
    is_filterable = COALESCE(p_is_filterable, is_filterable),
    is_required = COALESCE(p_is_required, is_required),
    is_active = COALESCE(p_is_active, is_active),
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_definition_id;

  IF NOT FOUND THEN
    success := false; error := 'ویژگی یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_attribute_definition(uuid, text, text, text, uuid, jsonb, boolean, boolean, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_attribute_definition(uuid, text, text, text, uuid, jsonb, boolean, boolean, boolean, integer) TO authenticated;

-- admin_delete_attribute_definition
CREATE OR REPLACE FUNCTION public.admin_delete_attribute_definition(p_definition_id uuid)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*) INTO v_value_count
  FROM public.product_attribute_values
  WHERE attribute_definition_id = p_definition_id;

  IF v_value_count > 0 THEN
    success := false; error := 'این ویژگی دارای مقادیر ثبت‌شده است و قابل حذف نیست. ابتدا آن را غیرفعال کنید';
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM public.product_attribute_definitions WHERE id = p_definition_id;

  IF NOT FOUND THEN
    success := false; error := 'ویژگی یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_attribute_definition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_attribute_definition(uuid) TO authenticated;

-- admin_reorder_attribute_definitions
CREATE OR REPLACE FUNCTION public.admin_reorder_attribute_definitions(
  p_ordered_ids jsonb
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  FOR item IN SELECT jsonb_array_elements(p_ordered_ids)
  LOOP
    UPDATE public.product_attribute_definitions
    SET sort_order = (item->>'display_order')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reorder_attribute_definitions(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reorder_attribute_definitions(jsonb) TO authenticated;

-- admin_create_variant
CREATE OR REPLACE FUNCTION public.admin_create_variant(
  p_product_id uuid, p_name text,
  p_attributes jsonb DEFAULT '{}'::jsonb,
  p_sku text DEFAULT NULL,
  p_sort_order integer DEFAULT 0
)
RETURNS TABLE(success boolean, error text, variant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_dup_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized'; variant_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    success := false; error := 'نام تنوع الزامی است'; variant_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*) INTO v_dup_count
  FROM public.product_variants
  WHERE product_id = p_product_id AND attributes = p_attributes;

  IF v_dup_count > 0 THEN
    success := false; error := 'تنوع با این ویژگی‌ها برای این محصول قبلاً ثبت شده است'; variant_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.product_variants (product_id, name, attributes, sku, sort_order)
  VALUES (p_product_id, trim(p_name), p_attributes, p_sku, p_sort_order)
  RETURNING id INTO v_id;

  success := true; error := NULL; variant_id := v_id;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_variant(uuid, text, jsonb, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_variant(uuid, text, jsonb, text, integer) TO authenticated;

-- admin_update_variant
CREATE OR REPLACE FUNCTION public.admin_update_variant(
  p_variant_id uuid,
  p_name text DEFAULT NULL, p_sku text DEFAULT NULL,
  p_attributes jsonb DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_sort_order integer DEFAULT NULL
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_dup_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_attributes IS NOT NULL THEN
    SELECT product_id INTO v_product_id FROM public.product_variants WHERE id = p_variant_id;
    IF v_product_id IS NULL THEN
      success := false; error := 'تنوع یافت نشد';
      RETURN NEXT;
      RETURN;
    END IF;

    SELECT count(*) INTO v_dup_count
    FROM public.product_variants
    WHERE product_id = v_product_id
      AND attributes = p_attributes
      AND id <> p_variant_id;

    IF v_dup_count > 0 THEN
      success := false; error := 'تنوع با این ویژگی‌ها برای این محصول قبلاً ثبت شده است';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  UPDATE public.product_variants SET
    name = COALESCE(p_name, name),
    sku = COALESCE(p_sku, sku),
    attributes = COALESCE(p_attributes, attributes),
    is_active = COALESCE(p_is_active, is_active),
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    success := false; error := 'تنوع یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_variant(uuid, text, text, jsonb, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_variant(uuid, text, text, jsonb, boolean, integer) TO authenticated;

-- admin_delete_variant
CREATE OR REPLACE FUNCTION public.admin_delete_variant(p_variant_id uuid)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM public.product_variants WHERE id = p_variant_id;

  IF NOT FOUND THEN
    success := false; error := 'تنوع یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_variant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_variant(uuid) TO authenticated;

-- admin_reorder_variants
CREATE OR REPLACE FUNCTION public.admin_reorder_variants(
  p_ordered_ids jsonb
)
RETURNS TABLE(success boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized';
    RETURN NEXT;
    RETURN;
  END IF;

  FOR item IN SELECT jsonb_array_elements(p_ordered_ids)
  LOOP
    UPDATE public.product_variants
    SET sort_order = (item->>'display_order')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reorder_variants(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reorder_variants(jsonb) TO authenticated;