/*
# Marketplace Foundation Security Fixes

## Overview
Fixes two verified security issues from the Phase 2 audit:
1. P2: product_inventory.reserved_quantity exposed to public clients
2. P3: ProductService.getPrices() returns expired/future prices

## Changes

### 1. product_inventory_public view (P2 fix)

Creates a view `public.product_inventory_public` that exposes only safe inventory
information to public clients:

- product_id
- stock_quantity (total physical stock)
- available_quantity = stock_quantity - reserved_quantity (derived, computed server-side)
- low_stock_threshold
- allow_backorder

The view does NOT expose reserved_quantity.

Security approach:
- The view uses `security_invoker = true` so it runs with the privileges of the
  caller and respects RLS on the underlying product_inventory table.
- The view definition includes a JOIN to products filtered by is_published/is_active/status
  so only inventory for published products is returned.
- Grants: SELECT only to anon + authenticated. No DML grants.
- Views are read-only by default (no INSTEAD OF triggers), so no write access is possible.

Admin/internal access to the raw `product_inventory` table is unchanged. Admins
continue to use the base table with full RLS policies for all CRUD operations.

### 2. No schema changes needed for P3 fix

The getPrices() date filtering fix is a code-level change in ProductService only.
No migration is required.

## Important Notes
1. The view uses `security_invoker = true` so RLS on the underlying product_inventory
   table is respected — the view does not bypass it.
2. reserved_quantity is never selected in the view definition — it only appears in
   the subtraction `stock_quantity - reserved_quantity` computed server-side.
3. No SECURITY DEFINER functions are created.
4. No existing policies or grants on the base product_inventory table are modified.
5. Admin access to the raw table is fully preserved.
*/

-- ============================================================================
-- 1. product_inventory_public view
-- ============================================================================

CREATE OR REPLACE VIEW public.product_inventory_public AS
SELECT
  pi.product_id,
  pi.stock_quantity,
  (pi.stock_quantity - pi.reserved_quantity) AS available_quantity,
  pi.low_stock_threshold,
  pi.allow_backorder
FROM public.product_inventory pi
INNER JOIN public.products p ON p.id = pi.product_id
WHERE p.is_published = true
  AND p.is_active = true
  AND p.status = 'published';

-- Make the view respect RLS of underlying tables (security_invoker)
ALTER VIEW public.product_inventory_public SET (security_invoker = true);

-- ============================================================================
-- Grants on the view
-- ============================================================================
-- Revoke all first
REVOKE ALL ON public.product_inventory_public FROM anon, authenticated;

-- Grant SELECT only — views are inherently read-only without INSTEAD OF triggers
GRANT SELECT ON public.product_inventory_public TO anon, authenticated;
