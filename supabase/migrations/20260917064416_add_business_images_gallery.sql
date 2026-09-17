/*
# Add Business Images Gallery System

## Summary
Creates a `business_images` table so each business can have up to 5 gallery images
(beyond the logo and cover). These are shown as a swipeable carousel on the public
business detail page and managed in the admin panel.

Also updates the `get_business_by_slug` RPC to return gallery images.

## Changes
1. New table `business_images`:
   - id (uuid PK)
   - business_id (uuid FK → businesses, CASCADE)
   - image_path (text, not null) — storage path in `businesses` bucket
   - sort_order (int, default 0)
   - created_at (timestamptz)
2. RLS on `business_images` — public read, admin write via SECURITY DEFINER RPCs
3. New RPCs:
   - `admin_add_business_image(business_id, image_path)` — adds an image (max 5 enforced)
   - `admin_delete_business_image(image_id)` — deletes an image row
   - `admin_list_business_images(business_id)` — returns all images for a business
4. Updated `get_business_by_slug` to also return `images` array
5. Updated `get_businesses` to also return `cover_path` (already present) — no change needed
*/

-- 1) Create business_images table
CREATE TABLE IF NOT EXISTS public.business_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for listing images by business
CREATE INDEX IF NOT EXISTS idx_business_images_business_id ON public.business_images(business_id);

-- Enable RLS
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS "public_read_business_images" ON public.business_images;
CREATE POLICY "public_read_business_images"
ON public.business_images FOR SELECT
TO anon, authenticated USING (true);

-- 2) admin_add_business_image
CREATE OR REPLACE FUNCTION public.admin_add_business_image(
  p_business_id uuid,
  p_image_path text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه این کار را ندارید');
  END IF;

  IF p_image_path IS NULL OR trim(p_image_path) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'مسیر تصویر الزامی است');
  END IF;

  SELECT count(*) INTO v_count FROM business_images WHERE business_id = p_business_id;
  IF v_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'حداکثر ۵ تصویر قابل آپلود است');
  END IF;

  SELECT coalesce(max(sort_order), 0) + 1 INTO v_count FROM business_images WHERE business_id = p_business_id;

  INSERT INTO business_images (business_id, image_path, sort_order)
  VALUES (p_business_id, trim(p_image_path), v_count)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'image_id', v_id);
END;
$function$;

-- 3) admin_delete_business_image
CREATE OR REPLACE FUNCTION public.admin_delete_business_image(
  p_image_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه این کار را ندارید');
  END IF;

  DELETE FROM business_images WHERE id = p_image_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'تصویر پیدا نشد');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 4) admin_list_business_images
CREATE OR REPLACE FUNCTION public.admin_list_business_images(
  p_business_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_images jsonb;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه این کار را ندارید');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', bi.id,
      'image_path', bi.image_path,
      'sort_order', bi.sort_order,
      'created_at', bi.created_at
    )
    ORDER BY bi.sort_order ASC, bi.created_at ASC
  ), '[]'::jsonb) INTO v_images
  FROM business_images bi
  WHERE bi.business_id = p_business_id;

  RETURN jsonb_build_object('success', true, 'images', v_images);
END;
$function$;

-- 5) Update get_business_by_slug to return gallery images
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
