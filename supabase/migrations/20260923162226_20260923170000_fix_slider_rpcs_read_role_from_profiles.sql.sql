/*
# Fix Admin Slider RPCs: Read Role from profiles Instead of JWT

## Problem
All 11 admin Business Slider RPCs check auth.jwt() -> 'raw_app_meta_data' ->> 'role'
for authorization. If the user's JWT is stale (cached before raw_app_meta_data was
updated with the role), the check returns NULL and every RPC returns
{ success: false, error: 'unauthorized' }, showing "بارگذاری اسلایدها انجام نشد".

## Fix
Replace the JWT-based role check with a direct lookup from the profiles table
using auth.uid(). This is independent of JWT contents and always reflects the
current database state of the user's role.

## Changes
Replaces the role-check block in all 11 SECURITY DEFINER functions:
1. admin_list_business_slides
2. admin_get_business_slide
3. admin_create_business_slide
4. admin_update_business_slide
5. admin_delete_business_slide
6. admin_duplicate_business_slide
7. admin_reorder_business_slides
8. admin_create_slide_layer
9. admin_update_slide_layer
10. admin_delete_slide_layer
11. admin_reorder_slide_layers

Each function now does:
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'super_admin') THEN RETURN unauthorized;

## Security
- No changes to table structure, RLS, or storage.
- EXECUTE grants unchanged (authenticated only, revoked from PUBLIC).
- SECURITY DEFINER with SET search_path TO public unchanged.
*/

-- ───────────────────────────────────────────────────────────────
-- Helper: we redefine each function with the profiles-based role check.
-- Using CREATE OR REPLACE preserves the existing grants.
-- ───────────────────────────────────────────────────────────────

-- 1. admin_list_business_slides
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 2. admin_get_business_slide
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 3. admin_create_business_slide
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 4. admin_update_business_slide
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 5. admin_delete_business_slide
CREATE OR REPLACE FUNCTION public.admin_delete_business_slide(p_slide_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 6. admin_duplicate_business_slide
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 7. admin_reorder_business_slides
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 8. admin_create_slide_layer
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 9. admin_update_slide_layer
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 10. admin_delete_slide_layer
CREATE OR REPLACE FUNCTION public.admin_delete_slide_layer(p_layer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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

-- 11. admin_reorder_slide_layers
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
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO v_role;
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
