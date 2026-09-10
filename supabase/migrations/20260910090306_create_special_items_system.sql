/*
# Create «ویژه» (Special) Items System

## Overview
Creates a dedicated database table and SECURITY DEFINER RPCs for managing
the premium «ویژه» homepage section items. This section displays a row of
square navigation cards on the Parsisho homepage, positioned immediately
below the Auction Hall section.

## New Tables
- `special_items`
  - `id` (uuid, PK, default gen_random_uuid())
  - `title` (text, NOT NULL) — Persian display title for the card
  - `description` (text, nullable) — optional short subtitle
  - `icon` (text, NOT NULL) — lucide-react icon key (e.g. 'gamepad', 'wallet')
  - `image_url` (text, nullable) — optional uploaded image/illustration URL
  - `destination_url` (text, NOT NULL) — internal route or external URL
  - `display_order` (integer, NOT NULL, default 0) — sort order
  - `is_published` (boolean, NOT NULL, default true) — published state
  - `is_enabled` (boolean, NOT NULL, default true) — enabled/disabled toggle
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- RLS enabled on `special_items`.
- Public SELECT policy: anon + authenticated can read rows where
  is_published = true AND is_enabled = true.
- All mutations go through SECURITY DEFINER RPCs that check is_admin_user().
- No direct INSERT/UPDATE/DELETE policies for any role.

## RPCs (all SECURITY DEFINER, search_path = public)
1. `admin_list_special_items()` — returns all items (admin only)
2. `admin_create_special_item(...)` — creates a new item (admin only)
3. `admin_update_special_item(...)` — updates an item (admin only)
4. `admin_delete_special_item(p_item_id)` — deletes an item (admin only)
5. `admin_reorder_special_items(p_ordered_ids)` — reorders items (admin only)
6. `admin_toggle_special_item(p_item_id, p_is_enabled)` — toggles enabled (admin only)
7. `admin_duplicate_special_item(p_item_id)` — duplicates an item (admin only)
8. `get_published_special_items(p_limit)` — public read for homepage

## Site Settings Seed
- `homepage_special_section` = { "enabled": true, "title": "ویژه", "max_visible": 6 }

## Seed Data
Six initial items: سرگرمی, قیمت روز, ابزار کاربردی, کتابخانه, هوش مصنوعی, پیشنهاد امروز
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. CREATE TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS special_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'sparkles',
  image_url text,
  destination_url text NOT NULL DEFAULT '#',
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for ordering queries
CREATE INDEX IF NOT EXISTS idx_special_items_display_order ON special_items (display_order);

-- Index for public read queries (filtering published + enabled)
CREATE INDEX IF NOT EXISTS idx_special_items_published_enabled ON special_items (is_published, is_enabled) WHERE is_published = true AND is_enabled = true;

-- ═══════════════════════════════════════════════════════════════
-- 2. ENABLE RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE special_items ENABLE ROW LEVEL SECURITY;

-- Public read: only published + enabled items
DROP POLICY IF EXISTS "read_published_special_items" ON special_items;
CREATE POLICY "read_published_special_items"
  ON special_items FOR SELECT
  TO anon, authenticated
  USING (is_published = true AND is_enabled = true);

-- No direct write policies — all writes go through SECURITY DEFINER RPCs

-- ═══════════════════════════════════════════════════════════════
-- 3. ADMIN RPCs (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════

-- 3a. LIST ALL ITEMS (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_special_items()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'icon', s.icon,
            'image_url', s.image_url,
            'destination_url', s.destination_url,
            'display_order', s.display_order,
            'is_published', s.is_published,
            'is_enabled', s.is_enabled,
            'created_at', s.created_at,
            'updated_at', s.updated_at
          )
          ORDER BY s.display_order ASC, s.created_at ASC
        )
        FROM public.special_items s
      ),
      '[]'::jsonb
    )
  );
END;
$function$;

-- 3b. CREATE ITEM (admin only)
CREATE OR REPLACE FUNCTION public.admin_create_special_item(
  p_title text,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT 'sparkles',
  p_image_url text DEFAULT NULL,
  p_destination_url text DEFAULT '#',
  p_display_order integer DEFAULT 0,
  p_is_published boolean DEFAULT true,
  p_is_enabled boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item_id uuid;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'عنوان الزامی است');
  END IF;

  IF p_destination_url IS NULL OR btrim(p_destination_url) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'مقصد الزامی است');
  END IF;

  INSERT INTO public.special_items (title, description, icon, image_url, destination_url, display_order, is_published, is_enabled)
  VALUES (p_title, p_description, p_icon, p_image_url, p_destination_url, p_display_order, p_is_published, p_is_enabled)
  RETURNING id INTO v_item_id;

  RETURN jsonb_build_object('success', true, 'item_id', v_item_id);
END;
$function$;

-- 3c. UPDATE ITEM (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_special_item(
  p_item_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_destination_url text DEFAULT NULL,
  p_display_order integer DEFAULT NULL,
  p_is_published boolean DEFAULT NULL,
  p_is_enabled boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.special_items WHERE id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'آیتم یافت نشد');
  END IF;

  UPDATE public.special_items
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    icon = COALESCE(p_icon, icon),
    image_url = COALESCE(p_image_url, image_url),
    destination_url = COALESCE(p_destination_url, destination_url),
    display_order = COALESCE(p_display_order, display_order),
    is_published = COALESCE(p_is_published, is_published),
    is_enabled = COALESCE(p_is_enabled, is_enabled),
    updated_at = now()
  WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 3d. DELETE ITEM (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_special_item(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.special_items WHERE id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'آیتم یافت نشد');
  END IF;

  DELETE FROM public.special_items WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 3e. REORDER ITEMS (admin only)
CREATE OR REPLACE FUNCTION public.admin_reorder_special_items(
  p_ordered_ids jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_entry jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  FOR v_entry IN SELECT jsonb_array_elements(p_ordered_ids)
  LOOP
    UPDATE public.special_items
    SET display_order = (v_entry->>'display_order')::integer,
        updated_at = now()
    WHERE id = (v_entry->>'id')::uuid;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 3f. TOGGLE ENABLED (admin only)
CREATE OR REPLACE FUNCTION public.admin_toggle_special_item(
  p_item_id uuid,
  p_is_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.special_items WHERE id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'آیتم یافت نشد');
  END IF;

  UPDATE public.special_items
  SET is_enabled = p_is_enabled, updated_at = now()
  WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 3g. DUPLICATE ITEM (admin only)
CREATE OR REPLACE FUNCTION public.admin_duplicate_special_item(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_source record;
  v_new_id uuid;
  v_max_order integer;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  SELECT * INTO v_source FROM public.special_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'آیتم یافت نشد');
  END IF;

  SELECT COALESCE(MAX(display_order), 0) INTO v_max_order FROM public.special_items;

  INSERT INTO public.special_items (title, description, icon, image_url, destination_url, display_order, is_published, is_enabled)
  VALUES (
    v_source.title || ' (کپی)',
    v_source.description,
    v_source.icon,
    v_source.image_url,
    v_source.destination_url,
    v_max_order + 1,
    false,
    v_source.is_enabled
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'item_id', v_new_id);
END;
$function$;

-- ═══════════════════════════════════════════════════════════════
-- 4. PUBLIC READ RPC
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_published_special_items(
  p_limit integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'icon', s.icon,
            'image_url', s.image_url,
            'destination_url', s.destination_url,
            'display_order', s.display_order
          )
          ORDER BY s.display_order ASC, s.created_at ASC
        )
        FROM (
          SELECT *
          FROM public.special_items
          WHERE is_published = true AND is_enabled = true
          ORDER BY display_order ASC, created_at ASC
          LIMIT LEAST(GREATEST(p_limit, 1), 20)
        ) s
      ),
      '[]'::jsonb
    )
  );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════
-- 5. SEED SITE SETTING
-- ═══════════════════════════════════════════════════════════════

INSERT INTO site_settings (key, value)
VALUES ('homepage_special_section', '{"enabled": true, "title": "ویژه", "max_visible": 6}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 6. SEED INITIAL SIX ITEMS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO special_items (title, description, icon, destination_url, display_order, is_published, is_enabled)
VALUES
  ('سرگرمی', 'سرزمین هیجان و بازی‌ها', 'gamepad', '/excitement', 1, true, true),
  ('قیمت روز', 'قیمت‌های لحظه‌ای بازار', 'trending_up', '#', 2, true, true),
  ('ابزار کاربردی', 'ابزارهای کاربردی روزمره', 'wrench', '#', 3, true, true),
  ('کتابخانه', 'کتابخانه دیجیتال پارسی شو', 'library', '#', 4, true, true),
  ('هوش مصنوعی', 'ابزارهای هوش مصنوعی', 'bot', '#', 5, true, true),
  ('پیشنهاد امروز', 'پیشنهادهای ویژه امروز', 'gift', '#', 6, true, true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 7. REVOKE EXECUTE ON RPCs FROM NON-ADMIN ROLES
-- ═══════════════════════════════════════════════════════════════

-- The admin_* functions check is_admin_user() internally, but we also
-- restrict EXECUTE to authenticated only (anon cannot call them).
-- get_published_special_items is callable by anyone (it returns only published items).

REVOKE EXECUTE ON FUNCTION public.admin_list_special_items() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_special_items() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_special_item(text, text, text, text, text, integer, boolean, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_create_special_item(text, text, text, text, text, integer, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_special_item(uuid, text, text, text, text, text, integer, boolean, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_special_item(uuid, text, text, text, text, text, integer, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_special_item(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_special_item(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_special_items(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_special_items(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_special_item(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_special_item(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_duplicate_special_item(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_duplicate_special_item(uuid) FROM anon;
