-- Phase 3: Missing list/get RPCs that were lost when the first migration's transaction rolled back

-- admin_list_products
CREATE OR REPLACE FUNCTION public.admin_list_products(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, name text, slug text, sku text, status text,
  category_id uuid, category_name text,
  brand_id uuid, brand_name text,
  is_published boolean, is_active boolean, sort_order integer,
  publish_at timestamptz, created_at timestamptz, updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.products p
  WHERE (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p.status = p_status)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_brand_id IS NULL OR p.brand_id = p_brand_id);

  RETURN QUERY
  SELECT
    p.id, p.name, p.slug, p.sku, p.status,
    p.category_id, c.name AS category_name,
    p.brand_id, b.name AS brand_name,
    p.is_published, p.is_active, p.sort_order,
    p.publish_at, p.created_at, p.updated_at,
    v_total AS total_count
  FROM public.products p
  LEFT JOIN public.product_categories c ON c.id = p.category_id
  LEFT JOIN public.product_brands b ON b.id = p.brand_id
  WHERE (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p.status = p_status)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_products(text, text, uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_products(text, text, uuid, uuid, integer, integer) TO authenticated;

-- admin_get_product
CREATE OR REPLACE FUNCTION public.admin_get_product(p_product_id uuid)
RETURNS TABLE(
  id uuid, name text, slug text, sku text, status text,
  category_id uuid, category_name text,
  brand_id uuid, brand_name text,
  short_description text, description text,
  seller_id uuid, producer_id uuid,
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
    p.seller_id, p.producer_id,
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

REVOKE EXECUTE ON FUNCTION public.admin_get_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_product(uuid) TO authenticated;

-- admin_list_brands
CREATE OR REPLACE FUNCTION public.admin_list_brands()
RETURNS TABLE(
  id uuid, name text, slug text, description text,
  is_active boolean, sort_order integer,
  product_count bigint,
  created_at timestamptz, updated_at timestamptz
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
    b.id, b.name, b.slug, b.description,
    b.is_active, b.sort_order,
    count(p.id) AS product_count,
    b.created_at, b.updated_at
  FROM public.product_brands b
  LEFT JOIN public.products p ON p.brand_id = b.id
  GROUP BY b.id, b.name, b.slug, b.description, b.is_active, b.sort_order, b.created_at, b.updated_at
  ORDER BY b.sort_order, b.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_brands() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_brands() TO authenticated;

-- admin_list_attribute_definitions
CREATE OR REPLACE FUNCTION public.admin_list_attribute_definitions()
RETURNS TABLE(
  id uuid, category_id uuid, category_name text,
  name text, slug text, attribute_type text,
  options jsonb, is_filterable boolean, is_required boolean,
  is_active boolean, sort_order integer,
  created_at timestamptz, updated_at timestamptz
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
    d.id, d.category_id, c.name AS category_name,
    d.name, d.slug, d.attribute_type,
    d.options, d.is_filterable, d.is_required,
    d.is_active, d.sort_order,
    d.created_at, d.updated_at
  FROM public.product_attribute_definitions d
  LEFT JOIN public.product_categories c ON c.id = d.category_id
  ORDER BY d.sort_order, d.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_attribute_definitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_attribute_definitions() TO authenticated;

-- admin_list_variants
CREATE OR REPLACE FUNCTION public.admin_list_variants(p_product_id uuid)
RETURNS TABLE(
  id uuid, product_id uuid, sku text, name text,
  attributes jsonb, is_active boolean, sort_order integer,
  created_at timestamptz, updated_at timestamptz
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
    v.id, v.product_id, v.sku, v.name,
    v.attributes, v.is_active, v.sort_order,
    v.created_at, v.updated_at
  FROM public.product_variants v
  WHERE v.product_id = p_product_id
  ORDER BY v.sort_order, v.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_variants(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_variants(uuid) TO authenticated;