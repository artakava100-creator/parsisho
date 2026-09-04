-- Fix admin_list_slides: use is_admin() instead of JWT raw_app_meta_data
--
-- Root cause: admin_list_slides checked auth.jwt() -> 'raw_app_meta_data' ->> 'role'
-- for the user's role, but roles are stored in profiles.role, not in JWT claims.
-- This caused the RPC to always return {success:false, error:'unauthorized'} for
-- real admin users, breaking the Admin Slideshow page.
-- All other admin RPCs use is_admin() which queries profiles.role directly.

CREATE OR REPLACE FUNCTION admin_list_slides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
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
