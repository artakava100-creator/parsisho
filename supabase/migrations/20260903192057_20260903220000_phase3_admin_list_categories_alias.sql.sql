-- Create admin_list_categories as a wrapper for admin_list_all_categories
-- The service layer calls admin_list_categories but the original migration created admin_list_all_categories
CREATE OR REPLACE FUNCTION public.admin_list_categories()
RETURNS TABLE(
  id uuid, parent_id uuid, name text, slug text,
  short_description text, description text,
  icon text, image_url text, banner_url text,
  sort_order integer, is_active boolean,
  show_on_home boolean, show_in_navigation boolean,
  seo_title text, seo_description text,
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
  SELECT * FROM public.admin_list_all_categories();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_categories() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_categories() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_categories() TO authenticated;