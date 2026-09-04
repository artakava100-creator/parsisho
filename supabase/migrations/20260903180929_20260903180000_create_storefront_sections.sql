/*
# Create storefront_sections table + admin RPCs

1. New Table: storefront_sections
   - id (uuid PK)
   - section_key (text, unique) — stable slug for code reference (e.g. "hero", "live_auction")
   - title (text, not null) — display title in Persian
   - subtitle (text, nullable) — optional description/subtitle
   - section_type (text, not null) — enum: hero, auction_spotlight, product_collection, category_grid, campaign_banner, custom_html, slideshow, trust_badges, navigation_cards
   - is_enabled (boolean, default true) — whether the section is active
   - status (text, default 'active') — enum: active, draft, archived
   - display_order (integer, default 0) — deterministic ordering, lower = first
   - visibility (text, default 'all') — enum: all, logged_in, logged_out (future use)
   - config (jsonb, default '{}') — section-specific configuration JSON
   - created_at (timestamptz, default now())
   - updated_at (timestamptz, default now())

2. Indexes
   - Unique index on section_key
   - Index on display_order for ordering queries
   - Index on status for filtering

3. Trigger
   - update_storefront_sections_updated_at — auto-update updated_at on row update

4. Security (RLS)
   - RLS enabled on storefront_sections
   - NO public/anon SELECT — public storefront consumption is deferred
   - NO authenticated SELECT — only admin RPCs access this table
   - All mutations go through SECURITY DEFINER RPCs

5. RPCs (all SECURITY DEFINER, SET search_path = public)
   - admin_list_storefront_sections() — returns all sections ordered by display_order
   - admin_get_storefront_section(p_section_id) — returns single section
   - admin_create_storefront_section(p_section_key, p_title, p_subtitle, p_section_type, p_is_enabled, p_status, p_display_order, p_visibility, p_config) — creates section
   - admin_update_storefront_section(p_section_id, p_title, p_subtitle, p_section_type, p_is_enabled, p_status, p_display_order, p_visibility, p_config) — updates section
   - admin_delete_storefront_section(p_section_id) — deletes section (only if status = 'draft' or 'archived')
   - admin_reorder_storefront_sections(p_ordered_ids jsonb) — atomically reorders sections by accepting an array of {id, display_order} pairs
   - admin_toggle_storefront_section(p_section_id, p_is_enabled) — quick toggle enable/disable

   All RPCs verify the caller is an admin (role = 'admin' or 'super_admin') from profiles table.
   EXECUTE granted to authenticated only. Revoked from anon and PUBLIC.
*/

-- ============================================================
-- 1. Create table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.storefront_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL,
  title text NOT NULL,
  subtitle text,
  section_type text NOT NULL CHECK (section_type IN (
    'hero', 'auction_spotlight', 'product_collection', 'category_grid',
    'campaign_banner', 'custom_html', 'slideshow', 'trust_badges', 'navigation_cards'
  )),
  is_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  display_order integer NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'logged_in', 'logged_out')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_sections_key ON public.storefront_sections (section_key);
CREATE INDEX IF NOT EXISTS idx_storefront_sections_display_order ON public.storefront_sections (display_order);
CREATE INDEX IF NOT EXISTS idx_storefront_sections_status ON public.storefront_sections (status);

-- ============================================================
-- 3. Trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_storefront_sections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_storefront_sections_updated_at ON public.storefront_sections;
CREATE TRIGGER trg_storefront_sections_updated_at
  BEFORE UPDATE ON public.storefront_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_storefront_sections_updated_at();

-- ============================================================
-- 4. RLS — locked down, only RPCs can access
-- ============================================================

ALTER TABLE public.storefront_sections ENABLE ROW LEVEL SECURITY;

-- No policies: table is locked. Only SECURITY DEFINER functions can access it.

-- ============================================================
-- 5. Revoke all direct access
-- ============================================================

REVOKE ALL ON public.storefront_sections FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_storefront_sections_updated_at() FROM PUBLIC, anon;

-- ============================================================
-- 6. Admin RPCs
-- ============================================================

-- Helper: check admin role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- admin_list_storefront_sections
CREATE OR REPLACE FUNCTION public.admin_list_storefront_sections()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'sections', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'section_key', s.section_key,
            'title', s.title,
            'subtitle', s.subtitle,
            'section_type', s.section_type,
            'is_enabled', s.is_enabled,
            'status', s.status,
            'display_order', s.display_order,
            'visibility', s.visibility,
            'config', s.config,
            'created_at', s.created_at,
            'updated_at', s.updated_at
          )
          ORDER BY s.display_order ASC, s.created_at ASC
        )
        FROM public.storefront_sections s
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_storefront_sections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_storefront_sections() TO authenticated;

-- admin_get_storefront_section
CREATE OR REPLACE FUNCTION public.admin_get_storefront_section(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.storefront_sections%ROWTYPE;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  SELECT * INTO v_row FROM public.storefront_sections WHERE id = p_section_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'بخش یافت نشد');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'section', jsonb_build_object(
      'id', v_row.id,
      'section_key', v_row.section_key,
      'title', v_row.title,
      'subtitle', v_row.subtitle,
      'section_type', v_row.section_type,
      'is_enabled', v_row.is_enabled,
      'status', v_row.status,
      'display_order', v_row.display_order,
      'visibility', v_row.visibility,
      'config', v_row.config,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_storefront_section(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_storefront_section(uuid) TO authenticated;

-- admin_create_storefront_section
CREATE OR REPLACE FUNCTION public.admin_create_storefront_section(
  p_section_key text,
  p_title text,
  p_subtitle text,
  p_section_type text,
  p_is_enabled boolean,
  p_status text,
  p_display_order integer,
  p_visibility text,
  p_config jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF p_section_key IS NULL OR length(p_section_key) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'کلید بخش نامعتبر است');
  END IF;
  IF p_title IS NULL OR length(p_title) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'عنوان بخش الزامی است');
  END IF;
  IF p_section_type NOT IN ('hero', 'auction_spotlight', 'product_collection', 'category_grid', 'campaign_banner', 'custom_html', 'slideshow', 'trust_badges', 'navigation_cards') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع بخش نامعتبر است');
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'draft', 'archived') THEN
    RETURN jsonb_build_object('success', false, 'error', 'وضعیت نامعتبر است');
  END IF;
  IF p_visibility IS NOT NULL AND p_visibility NOT IN ('all', 'logged_in', 'logged_out') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع نمایش نامعتبر است');
  END IF;

  SELECT count(*) INTO v_count FROM public.storefront_sections WHERE section_key = p_section_key;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'این کلید بخش قبلاً استفاده شده است');
  END IF;

  INSERT INTO public.storefront_sections (
    section_key, title, subtitle, section_type, is_enabled, status,
    display_order, visibility, config
  ) VALUES (
    p_section_key, p_title, p_subtitle, p_section_type,
    COALESCE(p_is_enabled, true), COALESCE(p_status, 'active'),
    COALESCE(p_display_order, 0), COALESCE(p_visibility, 'all'),
    COALESCE(p_config, '{}'::jsonb)
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'section_id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_storefront_section(text, text, text, text, boolean, text, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_storefront_section(text, text, text, text, boolean, text, integer, text, jsonb) TO authenticated;

-- admin_update_storefront_section
CREATE OR REPLACE FUNCTION public.admin_update_storefront_section(
  p_section_id uuid,
  p_title text,
  p_subtitle text,
  p_section_type text,
  p_is_enabled boolean,
  p_status text,
  p_display_order integer,
  p_visibility text,
  p_config jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  SELECT count(*) INTO v_count FROM public.storefront_sections WHERE id = p_section_id;
  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'بخش یافت نشد');
  END IF;

  IF p_title IS NOT NULL AND length(p_title) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'عنوان بخش الزامی است');
  END IF;
  IF p_section_type IS NOT NULL AND p_section_type NOT IN ('hero', 'auction_spotlight', 'product_collection', 'category_grid', 'campaign_banner', 'custom_html', 'slideshow', 'trust_badges', 'navigation_cards') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع بخش نامعتبر است');
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'draft', 'archived') THEN
    RETURN jsonb_build_object('success', false, 'error', 'وضعیت نامعتبر است');
  END IF;
  IF p_visibility IS NOT NULL AND p_visibility NOT IN ('all', 'logged_in', 'logged_out') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع نمایش نامعتبر است');
  END IF;

  UPDATE public.storefront_sections SET
    title = COALESCE(p_title, title),
    subtitle = p_subtitle,
    section_type = COALESCE(p_section_type, section_type),
    is_enabled = COALESCE(p_is_enabled, is_enabled),
    status = COALESCE(p_status, status),
    display_order = COALESCE(p_display_order, display_order),
    visibility = COALESCE(p_visibility, visibility),
    config = COALESCE(p_config, config)
  WHERE id = p_section_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_storefront_section(uuid, text, text, text, boolean, text, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_storefront_section(uuid, text, text, text, boolean, text, integer, text, jsonb) TO authenticated;

-- admin_delete_storefront_section
-- Only allows deletion of draft or archived sections (safety)
CREATE OR REPLACE FUNCTION public.admin_delete_storefront_section(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  SELECT status INTO v_status FROM public.storefront_sections WHERE id = p_section_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'بخش یافت نشد');
  END IF;

  IF v_status = 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'بخش فعال قابل حذف نیست — ابتدا آن را بایگانی کنید');
  END IF;

  DELETE FROM public.storefront_sections WHERE id = p_section_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_storefront_section(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_storefront_section(uuid) TO authenticated;

-- admin_reorder_storefront_sections
-- Accepts a JSON array of {id, display_order} pairs and atomically updates all
CREATE OR REPLACE FUNCTION public.admin_reorder_storefront_sections(p_ordered_ids jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_order integer;
  v_count integer;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF p_ordered_ids IS NULL OR jsonb_array_length(p_ordered_ids) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لیست ترتیب خالی است');
  END IF;

  v_count := jsonb_array_length(p_ordered_ids);
  FOR v_idx IN 0..v_count - 1 LOOP
    v_item := p_ordered_ids->v_idx;
    v_id := (v_item->>'id')::uuid;
    v_order := (v_item->>'display_order')::integer;

    IF v_id IS NULL OR v_order IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'داده ترتیب نامعتبر است');
    END IF;

    UPDATE public.storefront_sections
    SET display_order = v_order
    WHERE id = v_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'بخش یافت نشد در ترتیب‌بندی');
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reorder_storefront_sections(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reorder_storefront_sections(jsonb) TO authenticated;

-- admin_toggle_storefront_section
CREATE OR REPLACE FUNCTION public.admin_toggle_storefront_section(
  p_section_id uuid,
  p_is_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  SELECT count(*) INTO v_count FROM public.storefront_sections WHERE id = p_section_id;
  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'بخش یافت نشد');
  END IF;

  UPDATE public.storefront_sections
  SET is_enabled = p_is_enabled
  WHERE id = p_section_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_toggle_storefront_section(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_storefront_section(uuid, boolean) TO authenticated;
