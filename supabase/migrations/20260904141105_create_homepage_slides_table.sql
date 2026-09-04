/*
# Create homepage slideshow system

1. New Tables
- `homepage_slides` — stores slideshow slides for the public homepage.
  - `id` (uuid, primary key)
  - `title` (text, nullable) — optional slide title
  - `subtitle` (text, nullable) — optional slide subtitle/description
  - `desktop_image_url` (text, not null) — desktop background image URL
  - `mobile_image_url` (text, nullable) — optional mobile-specific image URL
  - `cta_text` (text, nullable) — optional CTA button text
  - `destination_url` (text, nullable) — clickable destination URL
  - `is_active` (boolean, default true) — enable/disable toggle
  - `sort_order` (integer, default 0) — display ordering
  - `start_at` (timestamptz, nullable) — optional schedule start
  - `end_at` (timestamptz, nullable) — optional schedule end
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `homepage_slides`.
- Public SELECT: anon + authenticated can read active slides that are within their schedule window.
- Admin writes: via SECURITY DEFINER RPC functions that check the user's role in JWT claims.
- `admin_upsert_slide` — insert or update a slide (admin only).
- `admin_delete_slide` — delete a slide (admin only).
- `admin_list_slides` — list all slides including inactive (admin only).

3. Notes
- The public read policy filters: is_active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()).
- Three default slides are seeded with placeholder data so the slideshow is functional out of the box.
*/

CREATE TABLE IF NOT EXISTS homepage_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  desktop_image_url text NOT NULL DEFAULT '',
  mobile_image_url text,
  cta_text text,
  destination_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE homepage_slides ENABLE ROW LEVEL SECURITY;

-- Public read: only active, in-schedule slides
DROP POLICY IF EXISTS "public_read_active_slides" ON homepage_slides;
CREATE POLICY "public_read_active_slides"
  ON homepage_slides FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );

-- Admin RPC: upsert slide
CREATE OR REPLACE FUNCTION admin_upsert_slide(
  p_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_subtitle text DEFAULT NULL,
  p_desktop_image_url text DEFAULT NULL,
  p_mobile_image_url text DEFAULT NULL,
  p_cta_text text DEFAULT NULL,
  p_destination_url text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_sort_order integer DEFAULT 0,
  p_start_at timestamptz DEFAULT NULL,
  p_end_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  result_id uuid;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO caller_role;
  IF caller_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO caller_role;
  END IF;
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE homepage_slides SET
      title = COALESCE(p_title, title),
      subtitle = COALESCE(p_subtitle, subtitle),
      desktop_image_url = COALESCE(p_desktop_image_url, desktop_image_url),
      mobile_image_url = COALESCE(p_mobile_image_url, mobile_image_url),
      cta_text = COALESCE(p_cta_text, cta_text),
      destination_url = COALESCE(p_destination_url, destination_url),
      is_active = COALESCE(p_is_active, is_active),
      sort_order = COALESCE(p_sort_order, sort_order),
      start_at = COALESCE(p_start_at, start_at),
      end_at = COALESCE(p_end_at, end_at),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO homepage_slides (
      title, subtitle, desktop_image_url, mobile_image_url,
      cta_text, destination_url, is_active, sort_order, start_at, end_at
    ) VALUES (
      p_title, p_subtitle, p_desktop_image_url, p_mobile_image_url,
      p_cta_text, p_destination_url, p_is_active, p_sort_order, p_start_at, p_end_at
    )
    RETURNING id INTO result_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$;

-- Admin RPC: delete slide
CREATE OR REPLACE FUNCTION admin_delete_slide(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO caller_role;
  IF caller_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO caller_role;
  END IF;
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  DELETE FROM homepage_slides WHERE id = p_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin RPC: list all slides (including inactive, ignoring schedule)
CREATE OR REPLACE FUNCTION admin_list_slides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT (auth.jwt() -> 'raw_app_meta_data' ->> 'role') INTO caller_role;
  IF caller_role IS NULL THEN
    SELECT (auth.jwt() ->> 'role') INTO caller_role;
  END IF;
  IF caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'slides', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'subtitle', subtitle,
          'desktop_image_url', desktop_image_url,
          'mobile_image_url', mobile_image_url,
          'cta_text', cta_text,
          'destination_url', destination_url,
          'is_active', is_active,
          'sort_order', sort_order,
          'start_at', start_at,
          'end_at', end_at,
          'created_at', created_at,
          'updated_at', updated_at
        )
        ORDER BY sort_order ASC, created_at ASC
      ) FROM homepage_slides),
      '[]'::jsonb
    )
  );
END;
$$;

-- Revoke execute from public, grant to authenticated
REVOKE EXECUTE ON FUNCTION admin_upsert_slide FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_delete_slide FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_list_slides FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_upsert_slide TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_slide TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_slides TO authenticated;

-- Seed 3 default slides
INSERT INTO homepage_slides (title, subtitle, desktop_image_url, mobile_image_url, cta_text, destination_url, is_active, sort_order)
VALUES
  ('مزایده زنده', 'در مزایده‌های زنده پارسیشو شرکت کنید و برنده شوید', '', NULL, 'مشاهده مزایده‌ها', '/auctions', true, 0),
  ('بازار مستقیم', 'خرید مستقیم محصولات با بهترین قیمت', '', NULL, 'ورود به بازار', '/market', true, 1),
  ('سرزمین هیجان', 'بازی‌های مهیج و جوایز ویژه', '', NULL, 'شروع بازی', '/excitement', true, 2)
ON CONFLICT DO NOTHING;
