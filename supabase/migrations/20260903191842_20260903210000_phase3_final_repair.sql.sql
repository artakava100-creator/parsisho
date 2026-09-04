-- Phase 3 Final Repair: Security + Missing RPCs

-- ============================================================================
-- 1. REVOKE EXECUTE FROM anon on all Phase 3 admin RPCs (defense-in-depth)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.admin_list_products(text, text, uuid, uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_product(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_product(text, text, uuid, text, text, text, uuid, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_product(uuid, text, text, uuid, text, text, text, uuid, integer, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_transition_product_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_publish_product(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_product_publish_at(uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_product(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_all_categories() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_category(text, text, uuid, text, text, text, integer, boolean, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_category(uuid, text, text, uuid, text, text, text, integer, boolean, boolean, boolean, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_category(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_categories(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_brands() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_brand(text, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_brand(uuid, text, text, text, boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_brand(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_brands(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_attribute_definitions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_attribute_definition(text, text, text, uuid, jsonb, boolean, boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_attribute_definition(uuid, text, text, text, uuid, jsonb, boolean, boolean, boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_attribute_definition(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_attribute_definitions(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_variants(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_variant(uuid, text, jsonb, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_variant(uuid, text, text, jsonb, boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_variant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_variants(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_category_cycle(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_products() FROM anon;

-- ============================================================================
-- 2. admin_bulk_transition_product_status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_bulk_transition_product_status(
  p_product_ids uuid[],
  p_new_status text
)
RETURNS TABLE(success boolean, error text, affected_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
  v_count integer := 0;
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    success := false; error := 'Unauthorized'; affected_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  FOREACH v_id IN ARRAY p_product_ids
  LOOP
    SELECT status INTO v_current FROM public.products WHERE id = v_id;
    IF NOT FOUND THEN
      CONTINUE;
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
      CONTINUE;
    END IF;

    IF p_new_status = 'scheduled' AND NOT EXISTS (
      SELECT 1 FROM public.products WHERE id = v_id AND publish_at IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;

    UPDATE public.products SET
      status = p_new_status,
      is_published = (p_new_status = 'published'),
      is_active = (p_new_status IN ('published', 'paused', 'scheduled'))
    WHERE id = v_id;

    v_count := v_count + 1;
  END LOOP;

  success := true; error := NULL; affected_count := v_count;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_bulk_transition_product_status(uuid[], text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_bulk_transition_product_status(uuid[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_transition_product_status(uuid[], text) TO authenticated;

-- ============================================================================
-- 3. admin_preview_product
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_preview_product(p_product_id uuid)
RETURNS TABLE(
  id uuid, name text, slug text, sku text, status text,
  category_id uuid, category_name text,
  brand_id uuid, brand_name text,
  short_description text, description text,
  is_published boolean, is_active boolean,
  is_new boolean, is_selected boolean, is_economic boolean,
  is_best_seller boolean, is_popular boolean, is_special_offer boolean,
  is_discounted boolean, sort_order integer,
  publish_at timestamptz, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.name, p.slug, p.sku, p.status,
    p.category_id, c.name AS category_name,
    p.brand_id, b.name AS brand_name,
    p.short_description, p.description,
    p.is_published, p.is_active,
    p.is_new, p.is_selected, p.is_economic,
    p.is_best_seller, p.is_popular, p.is_special_offer,
    p.is_discounted, p.sort_order,
    p.publish_at, p.created_at, p.updated_at
  FROM public.products p
  LEFT JOIN public.product_categories c ON c.id = p.category_id
  LEFT JOIN public.product_brands b ON b.id = p.brand_id
  WHERE p.id = p_product_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_preview_product(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_preview_product(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_preview_product(uuid) TO authenticated;

-- ============================================================================
-- 4. admin_deactivate_attribute_definition
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_deactivate_attribute_definition(
  p_definition_id uuid,
  p_deactivate boolean DEFAULT true
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

  UPDATE public.product_attribute_definitions
  SET is_active = NOT p_deactivate
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

REVOKE EXECUTE ON FUNCTION public.admin_deactivate_attribute_definition(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_deactivate_attribute_definition(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_attribute_definition(uuid, boolean) TO authenticated;

-- ============================================================================
-- 5. admin_list_attribute_values
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_attribute_values(
  p_product_id uuid DEFAULT NULL,
  p_definition_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, product_id uuid, product_name text,
  attribute_definition_id uuid, definition_name text, definition_slug text,
  value jsonb, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    v.id, v.product_id, p.name AS product_name,
    v.attribute_definition_id, d.name AS definition_name, d.slug AS definition_slug,
    v.value, v.created_at, v.updated_at
  FROM public.product_attribute_values v
  JOIN public.products p ON p.id = v.product_id
  JOIN public.product_attribute_definitions d ON d.id = v.attribute_definition_id
  WHERE (p_product_id IS NULL OR v.product_id = p_product_id)
    AND (p_definition_id IS NULL OR v.attribute_definition_id = p_definition_id)
  ORDER BY p.name, d.sort_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_attribute_values(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_attribute_values(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_attribute_values(uuid, uuid) TO authenticated;

-- ============================================================================
-- 6. admin_set_attribute_value
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_attribute_value(
  p_product_id uuid,
  p_definition_id uuid,
  p_value jsonb
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

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    success := false; error := 'محصول یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.product_attribute_definitions WHERE id = p_definition_id) THEN
    success := false; error := 'ویژگی یافت نشد';
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.product_attribute_values (product_id, attribute_definition_id, value)
  VALUES (p_product_id, p_definition_id, p_value)
  ON CONFLICT (product_id, attribute_definition_id)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  success := true; error := NULL;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_attribute_value(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_attribute_value(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_attribute_value(uuid, uuid, jsonb) TO authenticated;