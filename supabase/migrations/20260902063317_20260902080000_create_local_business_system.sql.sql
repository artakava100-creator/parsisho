/*
# Create Local Business System (محله کسب‌وکار)

## Purpose
Build a local marketplace/discovery area where users can discover trusted
local businesses, producers, shops and service providers. Users can browse
by category, search by name, and view business details. Admins can create,
edit, activate/deactivate and feature businesses through admin RPCs.

## Data Model

### business_categories
- `id` (uuid, PK)
- `name` (text, NOT NULL) — display name in Persian
- `slug` (text, NOT NULL, UNIQUE) — URL-safe identifier
- `description` (text, nullable) — optional category description
- `icon_name` (text, nullable) — lucide-react icon name for the category
- `display_order` (integer, NOT NULL, DEFAULT 0)
- `is_active` (boolean, NOT NULL, DEFAULT true)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

### businesses
- `id` (uuid, PK)
- `owner_id` (uuid, nullable, FK → auth.users) — optional business owner
- `name` (text, NOT NULL) — business name
- `slug` (text, NOT NULL, UNIQUE) — URL-safe identifier for slug routing
- `short_description` (text, nullable) — one-line description for cards
- `description` (text, nullable) — full description for detail page
- `category_id` (uuid, NOT NULL, FK → business_categories) — business category
- `city` (text, nullable) — city name
- `locality` (text, nullable) — neighborhood/local area
- `address` (text, nullable) — full address
- `phone` (text, nullable) — contact phone
- `website` (text, nullable) — website or social link
- `logo_path` (text, nullable) — storage path for logo image
- `cover_path` (text, nullable) — storage path for cover image
- `status` (text, NOT NULL, DEFAULT 'pending') — pending|active|inactive
- `is_featured` (boolean, NOT NULL, DEFAULT false)
- `display_order` (integer, NOT NULL, DEFAULT 0)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

## Security (RLS)
- business_categories: public read for active categories (anon + authenticated
  SELECT WHERE is_active = true). No INSERT/UPDATE/DELETE — all mutations via RPCs.
- businesses: public read for active businesses (anon + authenticated SELECT
  WHERE status = 'active'). No INSERT/UPDATE/DELETE — all mutations via RPCs.
- All RPCs are SECURITY DEFINER with SET search_path = public.
- Admin RPCs verify is_admin() before any mutation.

## RPCs
### Public
- get_business_categories() — returns active categories ordered by display_order
- get_businesses(p_category_slug, p_search, p_city, p_limit, p_offset) — returns
  active businesses with category info, filtered and paginated
- get_business_by_slug(p_slug) — returns single business with category info

### Admin (all check is_admin())
- admin_list_businesses(p_status, p_category_id, p_search) — returns all businesses
- admin_create_business(p_name, p_slug, p_short_description, p_description,
  p_category_id, p_city, p_locality, p_address, p_phone, p_website,
  p_logo_path, p_cover_path, p_status, p_is_featured, p_display_order)
- admin_update_business(p_business_id, ... all fields nullable ...)
- admin_list_all_categories() — returns all categories including inactive

## Storage
- Creates a 'businesses' storage bucket (public) for business logos and covers.
- Storage policies allow public read and authenticated upload.

## Seed Data
- Seeds 7 default categories: فروشگاه‌ها, تولیدکنندگان, خدمات, صنایع‌دستی,
  خوراکی و شیرینی, کشاورزی, سایر
*/

-- ============================================================
-- 1. Create business_categories table
-- ============================================================
CREATE TABLE IF NOT EXISTS business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon_name text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Create businesses table
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description text,
  category_id uuid NOT NULL REFERENCES business_categories(id) ON DELETE RESTRICT,
  city text,
  locality text,
  address text,
  phone text,
  website text,
  logo_path text,
  cover_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_business_categories_active_sort
  ON business_categories (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_businesses_status_featured_order
  ON businesses (status, is_featured, display_order);

CREATE INDEX IF NOT EXISTS idx_businesses_category
  ON businesses (category_id);

CREATE INDEX IF NOT EXISTS idx_businesses_city
  ON businesses (city);

CREATE INDEX IF NOT EXISTS idx_businesses_slug
  ON businesses (slug);

-- ============================================================
-- 4. Enable RLS
-- ============================================================
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies — public read for active records only
-- ============================================================
DROP POLICY IF EXISTS "public_read_active_business_categories" ON business_categories;
CREATE POLICY "public_read_active_business_categories"
  ON business_categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "public_read_active_businesses" ON businesses;
CREATE POLICY "public_read_active_businesses"
  ON businesses FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- No INSERT/UPDATE/DELETE policies — all mutations via SECURITY DEFINER RPCs

-- ============================================================
-- 6. Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_business_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_categories_updated_at ON business_categories;
CREATE TRIGGER trg_business_categories_updated_at
  BEFORE UPDATE ON business_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_business_categories_updated_at();

REVOKE EXECUTE ON FUNCTION update_business_categories_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_business_categories_updated_at() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION update_businesses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_businesses_updated_at();

REVOKE EXECUTE ON FUNCTION update_businesses_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_businesses_updated_at() FROM anon, authenticated;

-- ============================================================
-- 7. Public RPC: get_business_categories()
-- ============================================================
CREATE OR REPLACE FUNCTION get_business_categories()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_categories jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug,
      'description', c.description,
      'icon_name', c.icon_name,
      'display_order', c.display_order
    )
    ORDER BY c.display_order ASC, c.name ASC
  ), '[]'::jsonb) INTO v_categories
  FROM business_categories c
  WHERE c.is_active = true;

  RETURN jsonb_build_object('success', true, 'categories', v_categories);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_business_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_business_categories() TO anon, authenticated;

-- ============================================================
-- 8. Public RPC: get_businesses(p_category_slug, p_search, p_city, p_limit, p_offset)
-- ============================================================
CREATE OR REPLACE FUNCTION get_businesses(
  p_category_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_businesses jsonb;
  v_total integer;
BEGIN
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
      'is_featured', b.is_featured
    )
    ORDER BY b.is_featured DESC, b.display_order ASC, b.name ASC
  ), '[]'::jsonb) INTO v_businesses
  FROM businesses b
  JOIN business_categories c ON c.id = b.category_id
  WHERE b.status = 'active'
    AND (p_category_slug IS NULL OR c.slug = p_category_slug)
    AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%' OR b.short_description ILIKE '%' || p_search || '%')
    AND (p_city IS NULL OR b.city ILIKE '%' || p_city || '%');

  SELECT count(*) INTO v_total
  FROM businesses b
  JOIN business_categories c ON c.id = b.category_id
  WHERE b.status = 'active'
    AND (p_category_slug IS NULL OR c.slug = p_category_slug)
    AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%' OR b.short_description ILIKE '%' || p_search || '%')
    AND (p_city IS NULL OR b.city ILIKE '%' || p_city || '%');

  RETURN jsonb_build_object(
    'success', true,
    'businesses', v_businesses,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_businesses(text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_businesses(text, text, text, integer, integer) TO anon, authenticated;

-- ============================================================
-- 9. Public RPC: get_business_by_slug(p_slug)
-- ============================================================
CREATE OR REPLACE FUNCTION get_business_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business jsonb;
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

  RETURN jsonb_build_object('success', true, 'business', v_business);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_business_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_business_by_slug(text) TO anon, authenticated;

-- ============================================================
-- 10. Admin RPC: admin_list_all_categories()
--     Returns all categories including inactive (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_all_categories()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_categories jsonb;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه مشاهده دسته‌بندی‌ها را ندارید');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug,
      'description', c.description,
      'icon_name', c.icon_name,
      'display_order', c.display_order,
      'is_active', c.is_active
    )
    ORDER BY c.display_order ASC, c.name ASC
  ), '[]'::jsonb) INTO v_categories
  FROM business_categories c;

  RETURN jsonb_build_object('success', true, 'categories', v_categories);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_all_categories() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_list_all_categories() FROM anon;
GRANT EXECUTE ON FUNCTION admin_list_all_categories() TO authenticated;

-- ============================================================
-- 11. Admin RPC: admin_list_businesses(p_status, p_category_id, p_search)
--     Returns all businesses including pending/inactive (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_businesses(
  p_status text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      'created_at', b.created_at
    )
    ORDER BY b.created_at DESC
  ), '[]'::jsonb) INTO v_businesses
  FROM businesses b
  JOIN business_categories c ON c.id = b.category_id
  WHERE (p_status IS NULL OR b.status = p_status)
    AND (p_category_id IS NULL OR b.category_id = p_category_id)
    AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%');

  RETURN jsonb_build_object('success', true, 'businesses', v_businesses);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_businesses(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_list_businesses(text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_list_businesses(text, uuid, text) TO authenticated;

-- ============================================================
-- 12. Admin RPC: admin_create_business(...)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_create_business(
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
  p_display_order integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ایجاد کسب‌وکار ندارید');
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

  IF p_status NOT IN ('pending', 'active', 'inactive') THEN
    RETURN jsonb_build_object('success', false, 'error', 'وضعیت نامعتبر است');
  END IF;

  BEGIN
    INSERT INTO businesses (
      name, slug, category_id, short_description, description,
      city, locality, address, phone, website,
      logo_path, cover_path, status, is_featured, display_order
    ) VALUES (
      trim(p_name), lower(trim(p_slug)), p_category_id, p_short_description, p_description,
      p_city, p_locality, p_address, p_phone, p_website,
      p_logo_path, p_cover_path, p_status, p_is_featured, p_display_order
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true, 'business_id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_create_business(text, text, uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_create_business(text, text, uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer) FROM anon;
GRANT EXECUTE ON FUNCTION admin_create_business(text, text, uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer) TO authenticated;

-- ============================================================
-- 13. Admin RPC: admin_update_business(...)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_business(
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
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      name = COALESCE(NULLIF(trim(p_name), ''), name),
      slug = CASE WHEN p_slug IS NOT NULL AND trim(p_slug) <> '' THEN lower(trim(p_slug)) ELSE slug END,
      category_id = COALESCE(p_category_id, category_id),
      short_description = COALESCE(p_short_description, short_description),
      description = COALESCE(p_description, description),
      city = COALESCE(p_city, city),
      locality = COALESCE(p_locality, locality),
      address = COALESCE(p_address, address),
      phone = COALESCE(p_phone, phone),
      website = COALESCE(p_website, website),
      logo_path = COALESCE(p_logo_path, logo_path),
      cover_path = COALESCE(p_cover_path, cover_path),
      status = COALESCE(p_status, status),
      is_featured = COALESCE(p_is_featured, is_featured),
      display_order = COALESCE(p_display_order, display_order)
    WHERE id = p_business_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'این نامک قبلاً استفاده شده است');
  END;

  RETURN jsonb_build_object('success', true, 'business_id', p_business_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_business(uuid, text, text, uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_update_business(uuid, text, text, uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_business(uuid, text, text, uuid, text, text, text, text, text, text, text, text, text, text, boolean, integer) TO authenticated;

-- ============================================================
-- 14. Storage bucket for business images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('businesses', 'businesses', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for business images
DROP POLICY IF EXISTS "public_read_business_images" ON storage.objects;
CREATE POLICY "public_read_business_images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'businesses');

-- Authenticated upload to business images
DROP POLICY IF EXISTS "auth_upload_business_images" ON storage.objects;
CREATE POLICY "auth_upload_business_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'businesses');

-- Authenticated update/delete own business images
DROP POLICY IF EXISTS "auth_update_business_images" ON storage.objects;
CREATE POLICY "auth_update_business_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'businesses' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'businesses');

DROP POLICY IF EXISTS "auth_delete_business_images" ON storage.objects;
CREATE POLICY "auth_delete_business_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'businesses' AND owner = auth.uid());

-- ============================================================
-- 15. Seed default categories
-- ============================================================
INSERT INTO business_categories (name, slug, description, icon_name, display_order, is_active)
VALUES
  ('فروشگاه‌ها', 'stores', 'فروشگاه‌های محلی و آنلاین', 'Store', 1, true),
  ('تولیدکنندگان', 'producers', 'تولیدکنندگان محصولات محلی', 'Factory', 2, true),
  ('خدمات', 'services', 'ارائه‌دهندگان خدمات محلی', 'Wrench', 3, true),
  ('صنایع‌دستی', 'handicrafts', 'صنایع‌دستی و هنری', 'Brush', 4, true),
  ('خوراکی و شیرینی', 'food', 'خوراکی، شیرینی و سوغاتی', 'Cookie', 5, true),
  ('کشاورزی', 'agriculture', 'محصولات کشاورزی و دامی', 'Wheat', 6, true),
  ('سایر', 'other', 'سایر کسب‌وکارها', 'Building2', 7, true)
ON CONFLICT (slug) DO NOTHING;