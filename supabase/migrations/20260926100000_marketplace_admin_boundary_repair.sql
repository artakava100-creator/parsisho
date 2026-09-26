-- Marketplace Phase 0 boundary repairs.
-- Keep catalog mutations behind the existing admin SECURITY DEFINER RPCs.

REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.product_categories,
  public.products,
  public.product_variants,
  public.product_media,
  public.product_attribute_definitions,
  public.product_attribute_values,
  public.product_inventory,
  public.product_prices,
  public.product_brands
FROM authenticated;

-- Do not delegate Marketplace categories to the Local Business category system.
CREATE OR REPLACE FUNCTION public.admin_list_categories()
RETURNS TABLE(
  id uuid,
  parent_id uuid,
  name text,
  slug text,
  short_description text,
  description text,
  icon text,
  image_url text,
  banner_url text,
  sort_order integer,
  is_active boolean,
  show_on_home boolean,
  show_in_navigation boolean,
  seo_title text,
  seo_description text,
  created_at timestamptz,
  updated_at timestamptz
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
    c.id,
    c.parent_id,
    c.name,
    c.slug,
    c.short_description,
    c.description,
    c.icon,
    c.image_url,
    c.banner_url,
    c.sort_order,
    c.is_active,
    c.show_on_home,
    c.show_in_navigation,
    c.seo_title,
    c.seo_description,
    c.created_at,
    c.updated_at
  FROM public.product_categories c
  ORDER BY c.sort_order, c.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_categories() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_categories() TO authenticated;
