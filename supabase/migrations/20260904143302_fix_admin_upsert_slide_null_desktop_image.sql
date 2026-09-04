/*
# Fix admin_upsert_slide: handle NULL desktop_image_url on INSERT

Root cause: When creating a new slide (p_id IS NULL), p_desktop_image_url
defaults to NULL but the column is NOT NULL (default ''). The INSERT
was passing NULL directly, causing a constraint violation.

Fix: use COALESCE to fall back to '' for desktop_image_url on INSERT.
Also add explicit NULL-clearing support for nullable fields on UPDATE
by accepting a separate p_clear_* pattern — but the simpler approach is
to just COALESCE the desktop URL on INSERT and keep existing COALESCE on UPDATE.
*/

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
      start_at = p_start_at,
      end_at = p_end_at,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO homepage_slides (
      title, subtitle, desktop_image_url, mobile_image_url,
      cta_text, destination_url, is_active, sort_order, start_at, end_at
    ) VALUES (
      p_title,
      p_subtitle,
      COALESCE(p_desktop_image_url, ''),
      p_mobile_image_url,
      p_cta_text,
      p_destination_url,
      COALESCE(p_is_active, true),
      COALESCE(p_sort_order, 0),
      p_start_at,
      p_end_at
    )
    RETURNING id INTO result_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', result_id);
END;
$$;
