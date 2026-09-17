/*
# Enhance Admin Business RPCs

## Summary
Updates the `admin_list_businesses` RPC to also return `cover_path` (currently missing),
and adds a new `admin_delete_business` RPC so admins can delete businesses from the panel.
Also updates `admin_update_business` to support clearing fields (logo_path, cover_path,
short_description, etc.) by treating empty string '' as "set to NULL" instead of COALESCE skip.

## Changes
1. `admin_list_businesses` — add `cover_path` to the JSON output
2. `admin_update_business` — use CASE WHEN '' THEN NULL ELSE value END for text fields
   so admins can clear optional fields (logo, cover, description, etc.)
3. `admin_delete_business` — new SECURITY DEFINER RPC, admin-only, deletes a business row

## Security
- All three RPCs check `is_admin()` before operating.
- `admin_delete_business` is SECURITY DEFINER, admin-gated, search_path locked to public.
*/

-- 1) admin_list_businesses: add cover_path
CREATE OR REPLACE FUNCTION public.admin_list_businesses(
  p_status text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_businesses jsonb;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه مشاهده کسب‌وکارها را ندارید');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug,
      'short_description', b.short_description,
      'category_id', b.category_id,
      'category_name', c.name,
      'city', b.city,
      'locality', b.locality,
      'status', b.status,
      'is_featured', b.is_featured,
      'display_order', b.display_order,
      'logo_path', b.logo_path,
      'cover_path', b.cover_path,
      'created_at', b.created_at
    )
    ORDER BY b.display_order ASC, b.created_at DESC
  ), '[]'::jsonb) INTO v_businesses
  FROM businesses b
  JOIN business_categories c ON c.id = b.category_id
  WHERE (p_status IS NULL OR b.status = p_status)
    AND (p_category_id IS NULL OR b.category_id = p_category_id)
    AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%');

  RETURN jsonb_build_object('success', true, 'businesses', v_businesses);
END;
$function$;

-- 2) admin_update_business: allow clearing fields with empty string
CREATE OR REPLACE FUNCTION public.admin_update_business(
  p_business_id uuid,
  p_name text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_short_description text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_locality text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_logo_path text DEFAULT NULL,
  p_cover_path text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_is_featured boolean DEFAULT NULL,
  p_display_order integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_biz businesses%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ویرایش کسب‌وکار ندارید');
  END IF;

  SELECT * INTO v_biz FROM businesses WHERE id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'کسب‌وکار پیدا نشد');
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'active', 'inactive') THEN
    RETURN jsonb_build_object('success', false, 'error', 'وضعیت نامعتبر است');
  END IF;

  BEGIN
    UPDATE businesses SET
      name = CASE WHEN p_name IS NOT NULL AND trim(p_name) <> '' THEN trim(p_name) ELSE name END,
      slug = CASE WHEN p_slug IS NOT NULL AND trim(p_slug) <> '' THEN lower(trim(p_slug)) ELSE slug END,
      category_id = COALESCE(p_category_id, category_id),
      short_description = CASE WHEN p_short_description IS NULL THEN short_description ELSE NULLIF(p_short_description, '') END,
      description = CASE WHEN p_description IS NULL THEN description ELSE NULLIF(p_description, '') END,
      city = CASE WHEN p_city IS NULL THEN city ELSE NULLIF(p_city, '') END,
      locality = CASE WHEN p_locality IS NULL THEN locality ELSE NULLIF(p_locality, '') END,
      address = CASE WHEN p_address IS NULL THEN address ELSE NULLIF(p_address, '') END,
      phone = CASE WHEN p_phone IS NULL THEN phone ELSE NULLIF(p_phone, '') END,
      website = CASE WHEN p_website IS NULL THEN website ELSE NULLIF(p_website, '') END,
      logo_path = CASE WHEN p_logo_path IS NULL THEN logo_path ELSE NULLIF(p_logo_path, '') END,
      cover_path = CASE WHEN p_cover_path IS NULL THEN cover_path ELSE NULLIF(p_cover_path, '') END,
      status = COALESCE(p_status, status),
      is_featured = COALESCE(p_is_featured, is_featured),
      display_order = COALESCE(p_display_order, display_order)
    WHERE id = p_business_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true, 'business_id', p_business_id);
END;
$function$;

-- 3) admin_delete_business: new RPC
CREATE OR REPLACE FUNCTION public.admin_delete_business(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه حذف کسب‌وکار ندارید');
  END IF;

  DELETE FROM businesses WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'کسب‌وکار پیدا نشد');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;
