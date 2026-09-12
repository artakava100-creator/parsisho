/*
# Create Best-Selling Stores RPC for Homepage Auction Hall

1. Purpose
   - Aggregates real sales/order data to compute the best-selling stores (sellers) on the platform.
   - Used by the redesigned Homepage Auction Hall "پرفروش‌ترین فروشگاه‌ها" tab.
   - Content is always generated automatically from real order data — no manual curation.

2. New RPC
   - `get_best_selling_stores(p_limit int default 12)`
   - Joins `store_order_items` → `products` (on product_id::uuid = products.id) → `profiles` (on seller_id = profiles.id)
   - Only counts items from non-cancelled orders (joins `store_orders` to check status)
   - Groups by seller, sums total quantity and total revenue
   - Returns: seller_id, store_name, avatar_url, total_sold, total_revenue, top_product_name, top_product_image, product_count

3. Security
   - SECURITY DEFINER function — reads from tables that may have RLS.
   - Returns only public profile info (display_name, avatar_url) and aggregated sales numbers.
   - No sensitive data exposed.

4. Notes
   - `store_order_items.product_id` is text, `products.id` is uuid — cast applied.
   - Ordered by total_sold descending, then total_revenue descending.
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
  -- Only items from non-cancelled orders
  valid_items AS (
    SELECT soi.product_id, soi.product_name, soi.product_image, soi.quantity, soi.subtotal
    FROM store_order_items soi
    INNER JOIN store_orders so ON so.id = soi.order_id
    WHERE so.status != 'cancelled'
  ),
  -- Map items to products to get seller_id
  seller_items AS (
    SELECT
      p.seller_id,
      p.id AS product_id,
      p.name AS product_name,
      vi.quantity,
      vi.subtotal
    FROM valid_items vi
    INNER JOIN products p ON p.id = vi.product_id::uuid
    WHERE p.seller_id IS NOT NULL
  ),
  -- Aggregate per seller
  seller_stats AS (
    SELECT
      seller_id,
      SUM(quantity) AS total_sold,
      SUM(subtotal) AS total_revenue,
      COUNT(DISTINCT product_id) AS product_count
    FROM seller_items
    GROUP BY seller_id
  ),
  -- Find top product per seller (by quantity sold)
  top_products AS (
    SELECT DISTINCT ON (si.seller_id)
      si.seller_id,
      si.product_name AS top_product_name,
      (
        SELECT pm.url FROM product_media pm
        WHERE pm.product_id = si.product_id AND pm.is_primary = true
        LIMIT 1
      ) AS top_product_image
    FROM seller_items si
    ORDER BY si.seller_id, si.quantity DESC, si.subtotal DESC
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

-- Revoke execute from anon and authenticated; this is a public read-only RPC
REVOKE EXECUTE ON FUNCTION public.get_best_selling_stores(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_best_selling_stores(int) TO anon, authenticated;
