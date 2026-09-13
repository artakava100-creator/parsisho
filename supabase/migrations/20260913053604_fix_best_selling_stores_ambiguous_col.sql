/*
# Fix ambiguous column reference in get_best_selling_stores

1. Problem
   - The `seller_id` column reference was ambiguous between the `seller_items` CTE and the `seller_stats` CTE.
   - PostgreSQL error 42702: "column reference "seller_id" is ambiguous"

2. Fix
   - Table-qualify all column references in the top_products CTE and final SELECT.
   - Renumbered CTE column aliases to avoid ambiguity.
*/

CREATE OR REPLACE FUNCTION public.get_best_selling_stores(p_limit int DEFAULT 12)
RETURNS TABLE (
  seller_id uuid,
  store_name text,
  avatar_url text,
  total_sold bigint,
  total_revenue bigint,
  top_product_name text,
  top_product_image text,
  product_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  valid_items AS (
    SELECT soi.product_id, soi.product_name, soi.product_image, soi.quantity, soi.subtotal
    FROM store_order_items soi
    INNER JOIN store_orders so ON so.id = soi.order_id
    WHERE so.status != 'cancelled'
  ),
  seller_items AS (
    SELECT
      p.seller_id AS sid,
      p.id AS pid,
      p.name AS pname,
      vi.quantity AS qty,
      vi.subtotal AS sub
    FROM valid_items vi
    INNER JOIN products p ON p.id = vi.product_id::uuid
    WHERE p.seller_id IS NOT NULL
  ),
  seller_stats AS (
    SELECT
      si.sid AS seller_id,
      SUM(si.qty) AS total_sold,
      SUM(si.sub) AS total_revenue,
      COUNT(DISTINCT si.pid) AS product_count
    FROM seller_items si
    GROUP BY si.sid
  ),
  top_products AS (
    SELECT DISTINCT ON (si.sid)
      si.sid AS seller_id,
      si.pname AS top_product_name,
      (
        SELECT pm.url FROM product_media pm
        WHERE pm.product_id = si.pid AND pm.is_primary = true
        LIMIT 1
      ) AS top_product_image
    FROM seller_items si
    ORDER BY si.sid, si.qty DESC, si.sub DESC
  )
  SELECT
    ss.seller_id,
    pr.display_name AS store_name,
    pr.avatar_url,
    ss.total_sold,
    ss.total_revenue,
    tp.top_product_name,
    tp.top_product_image,
    ss.product_count
  FROM seller_stats ss
  INNER JOIN profiles pr ON pr.id = ss.seller_id
  LEFT JOIN top_products tp ON tp.seller_id = ss.seller_id
  ORDER BY ss.total_sold DESC, ss.total_revenue DESC
  LIMIT p_limit;
END;
$$;
