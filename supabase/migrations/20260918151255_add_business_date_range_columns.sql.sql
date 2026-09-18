/*
# Add date range columns to businesses

## Summary
Adds `start_date` and `end_date` (timestamptz, nullable) to the `businesses` table
so admins can set an active date range for each business (from a Persian/Jalali
start date to a Persian end date). Also updates admin RPCs to include these columns.

## Changes
1. `businesses` table — add `start_date` and `end_date` columns (timestamptz, nullable)
2. `admin_list_businesses` — include `start_date` and `end_date` in output
3. `admin_create_business` — accept `p_start_date` and `p_end_date` params
4. `admin_update_business` — accept `p_start_date` and `p_end_date` params
5. `get_business_by_slug` — include `start_date` and `end_date` in output
6. `get_businesses` — include `start_date` and `end_date` in output

## Security
- No RLS changes — existing policies remain intact.
- All admin RPCs still check `is_admin()` before operating.
*/

-- 1) Add columns
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz;

-- 2) admin_list_businesses — add start_date / end_date
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
      'start_date', b.start_date,
      'end_date', b.end_date,
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

-- 3) admin_create_business — add start_date / end_date params
CREATE OR REPLACE FUNCTION public.admin_create_business(
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
  p_cover_path text DEFAULT NULL,
  p_status text DEFAULT 'pending',
  p_is_featured boolean DEFAULT false,
  p_display_order integer DEFAULT 0,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ایجاد کسب‌وکار ندارید');
  END IF;

  IF p_status NOT IN ('pending', 'active', 'inactive') THEN
    RETURN jsonb_build_object('success', false, 'error', 'وضعیت نامعتبر است');
  END IF;

  BEGIN
    INSERT INTO businesses (
      name, slug, category_id, short_description, description,
      city, locality, address, phone, website,
      logo_path, cover_path, status, is_featured, display_order,
      start_date, end_date
    ) VALUES (
      trim(p_name), lower(trim(p_slug)), p_category_id,
      NULLIF(p_short_description, ''), NULLIF(p_description, ''),
      NULLIF(p_city, ''), NULLIF(p_locality, ''), NULLIF(p_address, ''),
      NULLIF(p_phone, ''), NULLIF(p_website, ''),
      NULLIF(p_logo_path, ''), NULLIF(p_cover_path, ''),
      p_status, p_is_featured, p_display_order,
      p_start_date, p_end_date
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true, 'business_id', v_id);
END;
$function$;

-- 4) admin_update_business — add start_date / end_date params
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
  p_display_order integer DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_clear_start_date boolean DEFAULT false,
  p_clear_end_date boolean DEFAULT false
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
      display_order = COALESCE(p_display_order, display_order),
      start_date = CASE WHEN p_clear_start_date THEN NULL ELSE COALESCE(p_start_date, start_date) END,
      end_date = CASE WHEN p_clear_end_date THEN NULL ELSE COALESCE(p_end_date, end_date) END
    WHERE id = p_business_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true, 'business_id', p_business_id);
END;
$function$;

-- 5) get_business_by_slug — add start_date / end_date
CREATE OR REPLACE FUNCTION public.get_business_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_business jsonb;
  v_images jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'slug', b.slug,
    'short_description', b.short_description,
    'description', b.description,
    'category_id', b.category_id,
    'category_name', c.name,
    'category_slug', c.slug,
    'city', b.city,
    'locality', b.locality,
    'address', b.address,
    'phone', b.phone,
    'website', b.website,
    'logo_path', b.logo_path,
    'cover_path', b.cover_path,
    'status', b.status,
    'is_featured', b.is_featured,
    'start_date', b.start_date,
    'end_date', b.end_date,
    'created_at', b.created_at
  ) INTO v_business
  FROM businesses b
  JOIN business_categories c ON c.id = b.category_id
  WHERE b.slug = p_slug AND b.status = 'active';

  IF v_business IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'کسب‌وکار مورد نظر پیدا نشد');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', bi.id,
      'image_path', bi.image_path,
      'sort_order', bi.sort_order
    )
    ORDER BY bi.sort_order ASC, bi.created_at ASC
  ), '[]'::jsonb) INTO v_images
  FROM business_images bi
  WHERE bi.business_id = (v_business->>'id')::uuid;

  RETURN jsonb_build_object('success', true, 'business', v_business, 'images', v_images);
END;
$function$;

-- 6) get_businesses — add start_date / end_date
CREATE OR REPLACE FUNCTION public.get_businesses(
  p_category_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_businesses jsonb;
  v_total integer;
BEGIN
  SELECT count(*) INTO v_total
  FROM businesses b
  JOIN business_categories c ON c.id = b.category_id
  WHERE b.status = 'active'
    AND (p_category_slug IS NULL OR c.slug = p_category_slug)
    AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%' OR b.short_description ILIKE '%' || p_search || '%')
    AND (p_city IS NULL OR b.city ILIKE '%' || p_city || '%');

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug,
      'short_description', b.short_description,
      'category_id', b.category_id,
      'category_name', c.name,
      'category_slug', c.slug,
      'city', b.city,
      'locality', b.locality,
      'logo_path', b.logo_path,
      'cover_path', b.cover_path,
      'is_featured', b.is_featured,
      'start_date', b.start_date,
      'end_date', b.end_date
    )
  ), '[]'::jsonb) INTO v_businesses
  FROM businesses b
  JOIN business_categories c ON c.id = b.category_id
  WHERE b.status = 'active'
    AND (p_category_slug IS NULL OR c.slug = p_category_slug)
    AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%' OR b.short_description ILIKE '%' || p_search || '%')
    AND (p_city IS NULL OR b.city ILIKE '%' || p_city || '%')
  ORDER BY b.is_featured DESC, b.display_order ASC, b.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object('success', true, 'businesses', v_businesses, 'total', v_total);
END;
$function$;

-- Re-grant execute on updated functions
REVOKE EXECUTE ON FUNCTION public.get_businesses(text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_businesses(text, text, text, integer, integer) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_business_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_by_slug(text) TO anon, authenticated;
