/*
# Business Slider System

## Summary
Creates a dedicated multi-slide, multi-layer promotional slider for the Business listing page,
with a full admin CMS for managing slides and layers.

## New Tables

### 1. `business_slides`
Stores individual slides for the Business page promotional slider.
- `id` (uuid PK)
- `internal_name` (text, NOT NULL) — admin-only label for identification
- `title` (text) — public heading
- `eyebrow` (text) — small text above heading
- `description` (text) — body text
- `cta_text` (text) — primary CTA button label
- `cta_url` (text) — primary CTA button link
- `cta2_text` (text) — secondary CTA button label (nullable)
- `cta2_url` (text) — secondary CTA button link (nullable)
- `background_image_path` (text) — background image path in business-slides bucket
- `main_image_path` (text) — main visual element image
- `mobile_image_path` (text) — optional dedicated mobile image
- `overlay_opacity` (int, 0-100, default 40) — dark overlay on background
- `content_position` (text, right|center|left, default right)
- `text_color` (text, light|dark, default light)
- `animation_type` (text, fade|slide|zoom|fade-slide|none, default fade-slide)
- `duration_ms` (int, default 6000) — autoplay duration per slide
- `transition_ms` (int, default 600) — transition speed
- `sort_order` (int, default 0)
- `is_active` (boolean, default true)
- `is_published` (boolean, default false) — draft vs published
- `starts_at` (timestamptz) — optional schedule start
- `ends_at` (timestamptz) — optional schedule end
- `link_type` (text, none|business|category|custom) — what the slide links to
- `link_business_id` (uuid FK businesses.id ON DELETE SET NULL)
- `link_category_id` (uuid FK business_categories.id ON DELETE SET NULL)
- `link_custom_url` (text)
- `created_at`, `updated_at` (timestamptz)

### 2. `business_slide_layers`
Stores additional layers for each slide (beyond standard composition fields).
- `id` (uuid PK)
- `slide_id` (uuid FK business_slides.id ON DELETE CASCADE)
- `layer_type` (text, image|text|button|decorative)
- `content` (text) — text content for text/button layers
- `image_path` (text) — for image-type layers
- `link_url` (text) — for button-type layers
- `position_x` (int, 0-100, default 50) — horizontal position %
- `position_y` (int, 0-100, default 50) — vertical position %
- `width` (int, 0-100) — width % for image layers (nullable)
- `z_index` (int, default 0)
- `animation_delay_ms` (int, default 0)
- `animation_type` (text, fade|slide|zoom|fade-slide|none, default fade-slide)
- `sort_order` (int, default 0)
- `is_visible` (boolean, default true)
- `created_at` (timestamptz)

## Security
- RLS enabled on both tables.
- `business_slides`: public SELECT for active+published+in-schedule slides (anon+authenticated).
  All mutations via SECURITY DEFINER RPCs with JWT role check.
- `business_slide_layers`: no direct policies — all access via SECURITY DEFINER RPCs.

## New Storage Bucket
- `business-slides` (public read, authenticated insert/update/delete)
- Follows the same pattern as `slideshow-images` bucket.

## New RPCs
### Public:
- `get_active_business_slides` — returns active+published+in-schedule slides with layers

### Admin (all SECURITY DEFINER, JWT role check for admin/super_admin):
- `admin_list_business_slides` — all slides with layer count
- `admin_get_business_slide` — single slide with full layers
- `admin_create_business_slide` — create slide
- `admin_update_business_slide` — update slide fields
- `admin_delete_business_slide` — delete slide (cascade layers)
- `admin_duplicate_business_slide` — deep copy slide + layers
- `admin_reorder_business_slides` — reorder slides
- `admin_create_slide_layer` — create layer
- `admin_update_slide_layer` — update layer
- `admin_delete_slide_layer` — delete layer
- `admin_reorder_slide_layers` — reorder layers within a slide
*/

-- ═══════════════════════════════════════════════════════════════════
-- 1. Create business_slides table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS business_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name text NOT NULL,
  title text,
  eyebrow text,
  description text,
  cta_text text,
  cta_url text,
  cta2_text text,
  cta2_url text,
  background_image_path text,
  main_image_path text,
  mobile_image_path text,
  overlay_opacity integer NOT NULL DEFAULT 40
    CHECK (overlay_opacity >= 0 AND overlay_opacity <= 100),
  content_position text NOT NULL DEFAULT 'right'
    CHECK (content_position IN ('right', 'center', 'left')),
  text_color text NOT NULL DEFAULT 'light'
    CHECK (text_color IN ('light', 'dark')),
  animation_type text NOT NULL DEFAULT 'fade-slide'
    CHECK (animation_type IN ('fade', 'slide', 'zoom', 'fade-slide', 'none')),
  duration_ms integer NOT NULL DEFAULT 6000,
  transition_ms integer NOT NULL DEFAULT 600,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  link_type text DEFAULT 'none'
    CHECK (link_type IN ('none', 'business', 'category', 'custom')),
  link_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  link_category_id uuid REFERENCES business_categories(id) ON DELETE SET NULL,
  link_custom_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_slides_active
  ON business_slides (is_active, is_published, sort_order);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Create business_slide_layers table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS business_slide_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id uuid NOT NULL REFERENCES business_slides(id) ON DELETE CASCADE,
  layer_type text NOT NULL
    CHECK (layer_type IN ('image', 'text', 'button', 'decorative')),
  content text,
  image_path text,
  link_url text,
  position_x integer NOT NULL DEFAULT 50
    CHECK (position_x >= 0 AND position_x <= 100),
  position_y integer NOT NULL DEFAULT 50
    CHECK (position_y >= 0 AND position_y <= 100),
  width integer
    CHECK (width IS NULL OR (width >= 0 AND width <= 100)),
  z_index integer NOT NULL DEFAULT 0,
  animation_delay_ms integer NOT NULL DEFAULT 0,
  animation_type text NOT NULL DEFAULT 'fade-slide'
    CHECK (animation_type IN ('fade', 'slide', 'zoom', 'fade-slide', 'none')),
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_slide_layers_slide
  ON business_slide_layers (slide_id, sort_order);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Enable RLS
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE business_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_slide_layers ENABLE ROW LEVEL SECURITY;

-- Public read: only active, published, in-schedule slides
DROP POLICY IF EXISTS "public_read_active_business_slides" ON business_slides;
CREATE POLICY "public_read_active_business_slides"
  ON business_slides FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND is_published = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- business_slide_layers: no direct policies (access via SECURITY DEFINER RPCs only)

-- ═══════════════════════════════════════════════════════════════════
-- 4. Storage bucket + policies
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-slides', 'business-slides', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_business_slides" ON storage.objects;
CREATE POLICY "public_read_business_slides"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'business-slides');

DROP POLICY IF EXISTS "auth_insert_business_slides" ON storage.objects;
CREATE POLICY "auth_insert_business_slides"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business-slides');

DROP POLICY IF EXISTS "auth_update_business_slides" ON storage.objects;
CREATE POLICY "auth_update_business_slides"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'business-slides')
  WITH CHECK (bucket_id = 'business-slides');

DROP POLICY IF EXISTS "auth_delete_business_slides" ON storage.objects;
CREATE POLICY "auth_delete_business_slides"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'business-slides');

-- ═══════════════════════════════════════════════════════════════════
-- 5. Helper: check admin role
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 6. Public RPC: get_active_business_slides
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_active_business_slides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_slides jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'internal_name', s.internal_name,
    'title', s.title,
    'eyebrow', s.eyebrow,
    'description', s.description,
    'cta_text', s.cta_text,
    'cta_url', s.cta_url,
    'cta2_text', s.cta2_text,
    'cta2_url', s.cta2_url,
    'background_image_path', s.background_image_path,
    'main_image_path', s.main_image_path,
    'mobile_image_path', s.mobile_image_path,
    'overlay_opacity', s.overlay_opacity,
    'content_position', s.content_position,
    'text_color', s.text_color,
    'animation_type', s.animation_type,
    'duration_ms', s.duration_ms,
    'transition_ms', s.transition_ms,
    'sort_order', s.sort_order,
    'link_type', s.link_type,
    'link_business_id', s.link_business_id,
    'link_category_id', s.link_category_id,
    'link_custom_url', s.link_custom_url,
    'layers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'layer_type', l.layer_type,
        'content', l.content,
        'image_path', l.image_path,
        'link_url', l.link_url,
        'position_x', l.position_x,
        'position_y', l.position_y,
        'width', l.width,
        'z_index', l.z_index,
        'animation_delay_ms', l.animation_delay_ms,
        'animation_type', l.animation_type,
        'sort_order', l.sort_order,
        'is_visible', l.is_visible
      ) ORDER BY l.z_index ASC, l.sort_order ASC)
      FROM business_slide_layers l
      WHERE l.slide_id = s.id AND l.is_visible = true
    ), '[]'::jsonb)
  ) ORDER BY s.sort_order ASC), '[]'::jsonb) INTO v_slides
  FROM business_slides s
  WHERE s.is_active = true
    AND s.is_published = true
    AND (s.starts_at IS NULL OR s.starts_at <= now())
    AND (s.ends_at IS NULL OR s.ends_at >= now());

  RETURN jsonb_build_object('success', true, 'slides', v_slides);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_business_slides() TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 7. Admin RPC: admin_list_business_slides
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_list_business_slides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_slides jsonb;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'internal_name', s.internal_name,
    'title', s.title,
    'eyebrow', s.eyebrow,
    'description', s.description,
    'cta_text', s.cta_text,
    'cta_url', s.cta_url,
    'cta2_text', s.cta2_text,
    'cta2_url', s.cta2_url,
    'background_image_path', s.background_image_path,
    'main_image_path', s.main_image_path,
    'mobile_image_path', s.mobile_image_path,
    'overlay_opacity', s.overlay_opacity,
    'content_position', s.content_position,
    'text_color', s.text_color,
    'animation_type', s.animation_type,
    'duration_ms', s.duration_ms,
    'transition_ms', s.transition_ms,
    'sort_order', s.sort_order,
    'is_active', s.is_active,
    'is_published', s.is_published,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'link_type', s.link_type,
    'link_business_id', s.link_business_id,
    'link_category_id', s.link_category_id,
    'link_custom_url', s.link_custom_url,
    'layer_count', (
      SELECT count(*) FROM business_slide_layers l WHERE l.slide_id = s.id
    ),
    'created_at', s.created_at,
    'updated_at', s.updated_at
  ) ORDER BY s.sort_order ASC), '[]'::jsonb) INTO v_slides
  FROM business_slides s;

  RETURN jsonb_build_object('success', true, 'slides', v_slides);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_business_slides() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_business_slides() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 8. Admin RPC: admin_get_business_slide
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_get_business_slide(p_slide_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_slide jsonb;
  v_layers jsonb;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'id', s.id,
    'internal_name', s.internal_name,
    'title', s.title,
    'eyebrow', s.eyebrow,
    'description', s.description,
    'cta_text', s.cta_text,
    'cta_url', s.cta_url,
    'cta2_text', s.cta2_text,
    'cta2_url', s.cta2_url,
    'background_image_path', s.background_image_path,
    'main_image_path', s.main_image_path,
    'mobile_image_path', s.mobile_image_path,
    'overlay_opacity', s.overlay_opacity,
    'content_position', s.content_position,
    'text_color', s.text_color,
    'animation_type', s.animation_type,
    'duration_ms', s.duration_ms,
    'transition_ms', s.transition_ms,
    'sort_order', s.sort_order,
    'is_active', s.is_active,
    'is_published', s.is_published,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'link_type', s.link_type,
    'link_business_id', s.link_business_id,
    'link_category_id', s.link_category_id,
    'link_custom_url', s.link_custom_url,
    'created_at', s.created_at,
    'updated_at', s.updated_at
  ) INTO v_slide
  FROM business_slides s
  WHERE s.id = p_slide_id;

  IF v_slide IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'اسلاید پیدا نشد');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'slide_id', l.slide_id,
    'layer_type', l.layer_type,
    'content', l.content,
    'image_path', l.image_path,
    'link_url', l.link_url,
    'position_x', l.position_x,
    'position_y', l.position_y,
    'width', l.width,
    'z_index', l.z_index,
    'animation_delay_ms', l.animation_delay_ms,
    'animation_type', l.animation_type,
    'sort_order', l.sort_order,
    'is_visible', l.is_visible
  ) ORDER BY l.sort_order ASC), '[]'::jsonb) INTO v_layers
  FROM business_slide_layers l
  WHERE l.slide_id = p_slide_id;

  RETURN jsonb_build_object('success', true, 'slide', v_slide, 'layers', v_layers);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_business_slide(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_business_slide(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 9. Admin RPC: admin_create_business_slide
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_create_business_slide(
  p_internal_name text,
  p_title text DEFAULT NULL,
  p_eyebrow text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_cta_text text DEFAULT NULL,
  p_cta_url text DEFAULT NULL,
  p_cta2_text text DEFAULT NULL,
  p_cta2_url text DEFAULT NULL,
  p_background_image_path text DEFAULT NULL,
  p_main_image_path text DEFAULT NULL,
  p_mobile_image_path text DEFAULT NULL,
  p_overlay_opacity integer DEFAULT 40,
  p_content_position text DEFAULT 'right',
  p_text_color text DEFAULT 'light',
  p_animation_type text DEFAULT 'fade-slide',
  p_duration_ms integer DEFAULT 6000,
  p_transition_ms integer DEFAULT 600,
  p_sort_order integer DEFAULT 0,
  p_is_active boolean DEFAULT true,
  p_is_published boolean DEFAULT false,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_link_type text DEFAULT 'none',
  p_link_business_id uuid DEFAULT NULL,
  p_link_category_id uuid DEFAULT NULL,
  p_link_custom_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_id uuid;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF p_internal_name IS NULL OR trim(p_internal_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'نام داخلی اسلاید الزامی است');
  END IF;

  INSERT INTO business_slides (
    internal_name, title, eyebrow, description,
    cta_text, cta_url, cta2_text, cta2_url,
    background_image_path, main_image_path, mobile_image_path,
    overlay_opacity, content_position, text_color,
    animation_type, duration_ms, transition_ms,
    sort_order, is_active, is_published,
    starts_at, ends_at,
    link_type, link_business_id, link_category_id, link_custom_url
  ) VALUES (
    trim(p_internal_name), p_title, p_eyebrow, p_description,
    p_cta_text, p_cta_url, p_cta2_text, p_cta2_url,
    p_background_image_path, p_main_image_path, p_mobile_image_path,
    p_overlay_opacity, p_content_position, p_text_color,
    p_animation_type, p_duration_ms, p_transition_ms,
    p_sort_order, p_is_active, p_is_published,
    p_starts_at, p_ends_at,
    p_link_type, p_link_business_id, p_link_category_id, p_link_custom_url
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_business_slide FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_business_slide TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 10. Admin RPC: admin_update_business_slide
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_update_business_slide(
  p_slide_id uuid,
  p_internal_name text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_eyebrow text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_cta_text text DEFAULT NULL,
  p_cta_url text DEFAULT NULL,
  p_cta2_text text DEFAULT NULL,
  p_cta2_url text DEFAULT NULL,
  p_background_image_path text DEFAULT NULL,
  p_main_image_path text DEFAULT NULL,
  p_mobile_image_path text DEFAULT NULL,
  p_overlay_opacity integer DEFAULT NULL,
  p_content_position text DEFAULT NULL,
  p_text_color text DEFAULT NULL,
  p_animation_type text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_transition_ms integer DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_is_published boolean DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_link_type text DEFAULT NULL,
  p_link_business_id uuid DEFAULT NULL,
  p_link_category_id uuid DEFAULT NULL,
  p_link_custom_url text DEFAULT NULL,
  p_clear_starts_at boolean DEFAULT false,
  p_clear_ends_at boolean DEFAULT false,
  p_clear_background_image boolean DEFAULT false,
  p_clear_main_image boolean DEFAULT false,
  p_clear_mobile_image boolean DEFAULT false,
  p_clear_link_business_id boolean DEFAULT false,
  p_clear_link_category_id boolean DEFAULT false,
  p_clear_link_custom_url boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_slides WHERE id = p_slide_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'اسلاید پیدا نشد');
  END IF;

  UPDATE business_slides SET
    internal_name = COALESCE(NULLIF(trim(p_internal_name), ''), internal_name),
    title = COALESCE(p_title, title),
    eyebrow = COALESCE(p_eyebrow, eyebrow),
    description = COALESCE(p_description, description),
    cta_text = COALESCE(p_cta_text, cta_text),
    cta_url = COALESCE(p_cta_url, cta_url),
    cta2_text = COALESCE(p_cta2_text, cta2_text),
    cta2_url = COALESCE(p_cta2_url, cta2_url),
    background_image_path = CASE
      WHEN p_clear_background_image THEN NULL
      ELSE COALESCE(p_background_image_path, background_image_path)
    END,
    main_image_path = CASE
      WHEN p_clear_main_image THEN NULL
      ELSE COALESCE(p_main_image_path, main_image_path)
    END,
    mobile_image_path = CASE
      WHEN p_clear_mobile_image THEN NULL
      ELSE COALESCE(p_mobile_image_path, mobile_image_path)
    END,
    overlay_opacity = COALESCE(p_overlay_opacity, overlay_opacity),
    content_position = COALESCE(p_content_position, content_position),
    text_color = COALESCE(p_text_color, text_color),
    animation_type = COALESCE(p_animation_type, animation_type),
    duration_ms = COALESCE(p_duration_ms, duration_ms),
    transition_ms = COALESCE(p_transition_ms, transition_ms),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active),
    is_published = COALESCE(p_is_published, is_published),
    starts_at = CASE WHEN p_clear_starts_at THEN NULL ELSE COALESCE(p_starts_at, starts_at) END,
    ends_at = CASE WHEN p_clear_ends_at THEN NULL ELSE COALESCE(p_ends_at, ends_at) END,
    link_type = COALESCE(p_link_type, link_type),
    link_business_id = CASE
      WHEN p_clear_link_business_id THEN NULL
      ELSE COALESCE(p_link_business_id, link_business_id)
    END,
    link_category_id = CASE
      WHEN p_clear_link_category_id THEN NULL
      ELSE COALESCE(p_link_category_id, link_category_id)
    END,
    link_custom_url = CASE
      WHEN p_clear_link_custom_url THEN NULL
      ELSE COALESCE(p_link_custom_url, link_custom_url)
    END,
    updated_at = now()
  WHERE id = p_slide_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_business_slide FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_business_slide TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 11. Admin RPC: admin_delete_business_slide
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_delete_business_slide(p_slide_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  DELETE FROM business_slides WHERE id = p_slide_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'اسلاید پیدا نشد');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_business_slide(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_business_slide(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 12. Admin RPC: admin_duplicate_business_slide
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_duplicate_business_slide(p_slide_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_slide business_slides%ROWTYPE;
  v_new_id uuid;
  v_max_sort integer;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_slide FROM business_slides WHERE id = p_slide_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'اسلاید پیدا نشد');
  END IF;

  SELECT COALESCE(MAX(sort_order), -1) INTO v_max_sort FROM business_slides;

  INSERT INTO business_slides (
    internal_name, title, eyebrow, description,
    cta_text, cta_url, cta2_text, cta2_url,
    background_image_path, main_image_path, mobile_image_path,
    overlay_opacity, content_position, text_color,
    animation_type, duration_ms, transition_ms,
    sort_order, is_active, is_published,
    starts_at, ends_at,
    link_type, link_business_id, link_category_id, link_custom_url
  ) VALUES (
    v_slide.internal_name || ' (کپی)',
    v_slide.title, v_slide.eyebrow, v_slide.description,
    v_slide.cta_text, v_slide.cta_url, v_slide.cta2_text, v_slide.cta2_url,
    v_slide.background_image_path, v_slide.main_image_path, v_slide.mobile_image_path,
    v_slide.overlay_opacity, v_slide.content_position, v_slide.text_color,
    v_slide.animation_type, v_slide.duration_ms, v_slide.transition_ms,
    v_max_sort + 1, false, false,
    NULL, NULL,
    v_slide.link_type, v_slide.link_business_id, v_slide.link_category_id, v_slide.link_custom_url
  )
  RETURNING id INTO v_new_id;

  -- Copy layers
  INSERT INTO business_slide_layers (
    slide_id, layer_type, content, image_path, link_url,
    position_x, position_y, width, z_index,
    animation_delay_ms, animation_type, sort_order, is_visible
  )
  SELECT
    v_new_id, layer_type, content, image_path, link_url,
    position_x, position_y, width, z_index,
    animation_delay_ms, animation_type, sort_order, is_visible
  FROM business_slide_layers
  WHERE slide_id = p_slide_id
  ORDER BY sort_order ASC;

  RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_duplicate_business_slide(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_business_slide(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 13. Admin RPC: admin_reorder_business_slides
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_reorder_business_slides(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_item jsonb;
  v_id text;
  v_order integer;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    v_id := v_item->>'id';
    v_order := (v_item->>'sort_order')::integer;
    UPDATE business_slides SET sort_order = v_order, updated_at = now() WHERE id = v_id::uuid;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reorder_business_slides(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reorder_business_slides(jsonb) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 14. Admin RPC: admin_create_slide_layer
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_create_slide_layer(
  p_slide_id uuid,
  p_layer_type text,
  p_content text DEFAULT NULL,
  p_image_path text DEFAULT NULL,
  p_link_url text DEFAULT NULL,
  p_position_x integer DEFAULT 50,
  p_position_y integer DEFAULT 50,
  p_width integer DEFAULT NULL,
  p_z_index integer DEFAULT 0,
  p_animation_delay_ms integer DEFAULT 0,
  p_animation_type text DEFAULT 'fade-slide',
  p_sort_order integer DEFAULT 0,
  p_is_visible boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_id uuid;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_slides WHERE id = p_slide_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'اسلاید پیدا نشد');
  END IF;

  INSERT INTO business_slide_layers (
    slide_id, layer_type, content, image_path, link_url,
    position_x, position_y, width, z_index,
    animation_delay_ms, animation_type, sort_order, is_visible
  ) VALUES (
    p_slide_id, p_layer_type, p_content, p_image_path, p_link_url,
    p_position_x, p_position_y, p_width, p_z_index,
    p_animation_delay_ms, p_animation_type, p_sort_order, p_is_visible
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_slide_layer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_slide_layer TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 15. Admin RPC: admin_update_slide_layer
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_update_slide_layer(
  p_layer_id uuid,
  p_layer_type text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_image_path text DEFAULT NULL,
  p_link_url text DEFAULT NULL,
  p_position_x integer DEFAULT NULL,
  p_position_y integer DEFAULT NULL,
  p_width integer DEFAULT NULL,
  p_z_index integer DEFAULT NULL,
  p_animation_delay_ms integer DEFAULT NULL,
  p_animation_type text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_visible boolean DEFAULT NULL,
  p_clear_content boolean DEFAULT false,
  p_clear_image boolean DEFAULT false,
  p_clear_link_url boolean DEFAULT false,
  p_clear_width boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_slide_layers WHERE id = p_layer_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'لایه پیدا نشد');
  END IF;

  UPDATE business_slide_layers SET
    layer_type = COALESCE(p_layer_type, layer_type),
    content = CASE WHEN p_clear_content THEN NULL ELSE COALESCE(p_content, content) END,
    image_path = CASE WHEN p_clear_image THEN NULL ELSE COALESCE(p_image_path, image_path) END,
    link_url = CASE WHEN p_clear_link_url THEN NULL ELSE COALESCE(p_link_url, link_url) END,
    position_x = COALESCE(p_position_x, position_x),
    position_y = COALESCE(p_position_y, position_y),
    width = CASE WHEN p_clear_width THEN NULL ELSE COALESCE(p_width, width) END,
    z_index = COALESCE(p_z_index, z_index),
    animation_delay_ms = COALESCE(p_animation_delay_ms, animation_delay_ms),
    animation_type = COALESCE(p_animation_type, animation_type),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_visible = COALESCE(p_is_visible, is_visible)
  WHERE id = p_layer_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_slide_layer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_slide_layer TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 16. Admin RPC: admin_delete_slide_layer
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_delete_slide_layer(p_layer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  DELETE FROM business_slide_layers WHERE id = p_layer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'لایه پیدا نشد');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_slide_layer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_slide_layer(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 17. Admin RPC: admin_reorder_slide_layers
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_reorder_slide_layers(
  p_slide_id uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
  v_item jsonb;
  v_id text;
  v_order integer;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
  IF v_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO v_role;
  END IF;
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    v_id := v_item->>'id';
    v_order := (v_item->>'sort_order')::integer;
    UPDATE business_slide_layers
    SET sort_order = v_order
    WHERE id = v_id::uuid AND slide_id = p_slide_id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reorder_slide_layers(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reorder_slide_layers(uuid, jsonb) TO authenticated;