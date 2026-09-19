/*
# Fix get_businesses aggregate ORDER BY error

## Problem
The `get_businesses` function used a top-level `ORDER BY` with `jsonb_agg`
without a `GROUP BY` clause, causing:
"column b.is_featured must appear in the GROUP BY clause or be used in an aggregate function"

## Fix
Move ORDER BY into the jsonb_agg aggregate's own ORDER BY clause,
and wrap LIMIT/OFFSET in a subquery so pagination works correctly.
*/

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
    ORDER BY b.is_featured DESC, b.display_order ASC, b.created_at DESC
  ), '[]'::jsonb) INTO v_businesses
  FROM (
    SELECT b.id, b.name, b.slug, b.short_description,
           b.category_id, b.city, b.locality,
           b.logo_path, b.cover_path, b.is_featured,
           b.display_order, b.created_at,
           b.start_date, b.end_date,
           c.name AS category_name, c.slug AS category_slug
    FROM businesses b
    JOIN business_categories c ON c.id = b.category_id
    WHERE b.status = 'active'
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%' OR b.short_description ILIKE '%' || p_search || '%')
      AND (p_city IS NULL OR b.city ILIKE '%' || p_city || '%')
    ORDER BY b.is_featured DESC, b.display_order ASC, b.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) b;

  RETURN jsonb_build_object('success', true, 'businesses', v_businesses, 'total', v_total);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_businesses(text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_businesses(text, text, text, integer, integer) TO anon, authenticated;
