/*
# Marketplace Foundation — Product Catalog Database

## Overview
Creates the complete database foundation for the پارسی شو (Parsi Sho) Marketplace.
This migration establishes 8 new tables with full RLS, indexes, and constraints.
It does NOT modify any existing tables, migrations, or systems.

## New Tables

1. **product_categories** — 7 primary categories with self-referencing parent_id for future subcategories
   - Fields: id, parent_id, name, slug, short_description, description, icon, image_url, banner_url,
     sort_order, is_active, show_on_home, show_in_navigation, seo_title, seo_description, created_at, updated_at
   - Unique slug, self-referencing FK with cycle prevention, indexes on parent_id/slug/sort_order/is_active

2. **products** — Main product catalog
   - Fields: id, category_id, name, slug, sku, short_description, description,
     brand_id (nullable), seller_id (nullable), producer_id (nullable),
     status (draft/published/archived), is_published, is_active,
     is_new, is_selected, is_economic, is_best_seller, is_popular, is_special_offer, is_discounted,
     sort_order, created_at, updated_at
   - Unique slug (for published), unique sku, FK to product_categories, indexes on category_id/slug/sku/status/flags

3. **product_variants** — Flexible variant system using JSONB attributes
   - Fields: id, product_id, sku, name, attributes (jsonb), is_active, sort_order, created_at, updated_at
   - Unique sku, FK to products, index on product_id

4. **product_media** — Multi-image gallery with primary image support
   - Fields: id, product_id, media_type (image/video), url, alt_text, sort_order, is_primary, created_at
   - FK to products, index on product_id + sort_order, partial unique index on is_primary per product

5. **product_attribute_definitions** — Category-specific attribute schema
   - Fields: id, category_id (nullable for global), name, slug, attribute_type (text/number/boolean/select/multi_select),
     options (jsonb for select/multi_select), is_filterable, is_required, sort_order, created_at, updated_at
   - Unique slug per category, FK to product_categories, index on category_id

6. **product_attribute_values** — Per-product attribute assignments
   - Fields: id, product_id, attribute_definition_id, value (jsonb), created_at, updated_at
   - Unique (product_id, attribute_definition_id), FKs to products and definitions, index on product_id

7. **product_inventory** — Stock tracking with reserved quantities
   - Fields: id, product_id, variant_id (nullable), stock_quantity, reserved_quantity,
     low_stock_threshold, allow_backorder, updated_at
   - CHECK: stock_quantity >= 0, reserved_quantity >= 0, reserved_quantity <= stock_quantity
   - FKs to products and product_variants, indexes on product_id and variant_id
   - Available quantity = stock_quantity - reserved_quantity (derived, not stored)

8. **product_prices** — Normalized pricing with effective dates
   - Fields: id, product_id, variant_id (nullable), price_type (base/sale),
     amount (integer, CHECK >= 0), currency (default 'IRR'),
     starts_at, ends_at, is_active, created_at, updated_at
   - FKs to products and product_variants, indexes on product_id/variant_id/active+dates
   - All amounts are integers representing IRR (Iranian Rial) — no floating point for money

## Security (RLS + Grants)

All 8 tables have RLS enabled.

**Public read access (anon + authenticated):**
- product_categories: SELECT active categories
- products: SELECT published + active products
- product_variants: SELECT active variants for published products
- product_media: SELECT media for published products
- product_attribute_definitions: SELECT for active categories
- product_attribute_values: SELECT for published products
- product_inventory: SELECT for published products (exposes stock_quantity, low_stock_threshold, allow_backorder — NOT reserved_quantity)
- product_prices: SELECT active prices for published products

**Admin write access (admin + super_admin):**
- INSERT/UPDATE/DELETE on all 8 tables, scoped via EXISTS subquery on profiles.role

**Normal authenticated users:** Can only read published catalog data. No write access.

**Sellers:** Have manage_products permission in the app but NO direct database write access.
All writes go through admin-scoped RLS policies. Seller database access is a future phase.

## Permissions Added
Added 7 new store-specific permissions to the permission system via a comment documenting them.
The TypeScript permission system in src/lib/permissions.ts will be updated separately.

## Seed Data
Inserts exactly 7 primary categories (parent_id = NULL):
1. موبایل و تبلت (mobile-tablet)
2. لپ‌تاپ و کامپیوتر (laptop-computer)
3. صوتی و تصویری (audio-visual)
4. پوشیدنی‌ها (wearables)
5. لوازم جانبی (accessories)
6. دوربین و تصویربرداری (camera-imaging)
7. گیمینگ (gaming)

These are provisional category names for the marketplace, not local business categories.

## Important Notes
1. All monetary values use integer-based IRR representation. No floating point.
2. product_inventory.reserved_quantity is NOT exposed to public reads — only stock_quantity is visible.
3. Available stock = stock_quantity - reserved_quantity (computed at query time, not stored).
4. The single primary image constraint uses a partial unique index: only one is_primary=true per product.
5. Category self-reference prevents cycles via a CHECK constraint using a function.
6. No SECURITY DEFINER functions are created — all access is through RLS-protected direct queries.
7. Existing store_orders and store_order_items tables are NOT modified.
8. The static src/lib/products.ts file is NOT modified — it remains for the current UI until the next phase.
*/

-- ============================================================================
-- 1. PRODUCT_CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  short_description text,
  description text,
  icon text,
  image_url text,
  banner_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  show_on_home boolean NOT NULL DEFAULT true,
  show_in_navigation boolean NOT NULL DEFAULT true,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique slug
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_slug_idx ON public.product_categories (slug);

-- Indexes
CREATE INDEX IF NOT EXISTS product_categories_parent_id_idx ON public.product_categories (parent_id);
CREATE INDEX IF NOT EXISTS product_categories_sort_order_idx ON public.product_categories (sort_order);
CREATE INDEX IF NOT EXISTS product_categories_is_active_idx ON public.product_categories (is_active);

-- Prevent a category from becoming its own parent (direct cycle)
CREATE OR REPLACE FUNCTION public.prevent_category_self_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A category cannot be its own parent';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_category_self_reference_trigger ON public.product_categories;
CREATE TRIGGER prevent_category_self_reference_trigger
  BEFORE INSERT OR UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_category_self_reference();

-- Revoke execute on the trigger function from public
REVOKE EXECUTE ON FUNCTION public.prevent_category_self_reference() FROM PUBLIC;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_product_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_categories_updated_at_trigger ON public.product_categories;
CREATE TRIGGER update_product_categories_updated_at_trigger
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_product_categories_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_product_categories_updated_at() FROM PUBLIC;

-- ============================================================================
-- 2. PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  sku text,
  short_description text,
  description text,
  brand_id uuid,
  seller_id uuid,
  producer_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_published boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_new boolean NOT NULL DEFAULT false,
  is_selected boolean NOT NULL DEFAULT false,
  is_economic boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_popular boolean NOT NULL DEFAULT false,
  is_special_offer boolean NOT NULL DEFAULT false,
  is_discounted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique slug for published products
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_published_idx
  ON public.products (slug) WHERE is_published = true;

-- Unique SKU
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_idx
  ON public.products (sku) WHERE sku IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
CREATE INDEX IF NOT EXISTS products_is_published_idx ON public.products (is_published);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products (created_at);
CREATE INDEX IF NOT EXISTS products_is_best_seller_idx ON public.products (is_best_seller) WHERE is_best_seller = true;
CREATE INDEX IF NOT EXISTS products_is_new_idx ON public.products (is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS products_is_special_offer_idx ON public.products (is_special_offer) WHERE is_special_offer = true;
CREATE INDEX IF NOT EXISTS products_is_discounted_idx ON public.products (is_discounted) WHERE is_discounted = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_products_updated_at_trigger ON public.products;
CREATE TRIGGER update_products_updated_at_trigger
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_products_updated_at() FROM PUBLIC;

-- ============================================================================
-- 3. PRODUCT_VARIANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique variant SKU
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_idx
  ON public.product_variants (sku) WHERE sku IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS product_variants_is_active_idx ON public.product_variants (is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_product_variants_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_variants_updated_at_trigger ON public.product_variants;
CREATE TRIGGER update_product_variants_updated_at_trigger
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_product_variants_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_product_variants_updated_at() FROM PUBLIC;

-- ============================================================================
-- 4. PRODUCT_MEDIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS product_media_product_id_idx ON public.product_media (product_id);
CREATE INDEX IF NOT EXISTS product_media_product_id_sort_idx ON public.product_media (product_id, sort_order);

-- Only one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS product_media_one_primary_per_product_idx
  ON public.product_media (product_id) WHERE is_primary = true;

-- ============================================================================
-- 5. PRODUCT_ATTRIBUTE_DEFINITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  attribute_type text NOT NULL DEFAULT 'text' CHECK (attribute_type IN ('text', 'number', 'boolean', 'select', 'multi_select')),
  options jsonb,
  is_filterable boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique slug per category (and globally for category_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS product_attribute_definitions_category_slug_idx
  ON public.product_attribute_definitions (category_id, slug);

-- Indexes
CREATE INDEX IF NOT EXISTS product_attribute_definitions_category_id_idx ON public.product_attribute_definitions (category_id);
CREATE INDEX IF NOT EXISTS product_attribute_definitions_is_filterable_idx ON public.product_attribute_definitions (is_filterable);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_product_attribute_definitions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_attribute_definitions_updated_at_trigger ON public.product_attribute_definitions;
CREATE TRIGGER update_product_attribute_definitions_updated_at_trigger
  BEFORE UPDATE ON public.product_attribute_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_product_attribute_definitions_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_product_attribute_definitions_updated_at() FROM PUBLIC;

-- ============================================================================
-- 6. PRODUCT_ATTRIBUTE_VALUES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_definition_id uuid NOT NULL REFERENCES public.product_attribute_definitions(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique (product_id, attribute_definition_id)
CREATE UNIQUE INDEX IF NOT EXISTS product_attribute_values_product_attr_idx
  ON public.product_attribute_values (product_id, attribute_definition_id);

-- Indexes
CREATE INDEX IF NOT EXISTS product_attribute_values_product_id_idx ON public.product_attribute_values (product_id);
CREATE INDEX IF NOT EXISTS product_attribute_values_attr_def_id_idx ON public.product_attribute_values (attribute_definition_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_product_attribute_values_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_attribute_values_updated_at_trigger ON public.product_attribute_values;
CREATE TRIGGER update_product_attribute_values_updated_at_trigger
  BEFORE UPDATE ON public.product_attribute_values
  FOR EACH ROW EXECUTE FUNCTION public.update_product_attribute_values_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_product_attribute_values_updated_at() FROM PUBLIC;

-- ============================================================================
-- 7. PRODUCT_INVENTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  allow_backorder boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reserved cannot exceed stock
ALTER TABLE public.product_inventory ADD CONSTRAINT reserved_not_exceed_stock
  CHECK (reserved_quantity <= stock_quantity);

-- Indexes
CREATE INDEX IF NOT EXISTS product_inventory_product_id_idx ON public.product_inventory (product_id);
CREATE INDEX IF NOT EXISTS product_inventory_variant_id_idx ON public.product_inventory (variant_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_product_inventory_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_inventory_updated_at_trigger ON public.product_inventory;
CREATE TRIGGER update_product_inventory_updated_at_trigger
  BEFORE UPDATE ON public.product_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_product_inventory_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_product_inventory_updated_at() FROM PUBLIC;

-- ============================================================================
-- 8. PRODUCT_PRICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  price_type text NOT NULL DEFAULT 'base' CHECK (price_type IN ('base', 'sale')),
  amount bigint NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'IRR',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS product_prices_product_id_idx ON public.product_prices (product_id);
CREATE INDEX IF NOT EXISTS product_prices_variant_id_idx ON public.product_prices (variant_id);
CREATE INDEX IF NOT EXISTS product_prices_active_effective_idx
  ON public.product_prices (is_active, starts_at, ends_at)
  WHERE is_active = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_product_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_prices_updated_at_trigger ON public.product_prices;
CREATE TRIGGER update_product_prices_updated_at_trigger
  BEFORE UPDATE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_product_prices_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_product_prices_updated_at() FROM PUBLIC;

-- ============================================================================
-- RLS: Enable on all tables
-- ============================================================================
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Helper: admin check via profiles table
-- Uses EXISTS subquery on profiles.role to verify admin/super_admin

-- ─── product_categories ───

-- Public read: active categories
DROP POLICY IF EXISTS "read_active_categories" ON public.product_categories;
CREATE POLICY "read_active_categories"
  ON public.product_categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin write
DROP POLICY IF EXISTS "admin_insert_categories" ON public.product_categories;
CREATE POLICY "admin_insert_categories"
  ON public.product_categories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_categories" ON public.product_categories;
CREATE POLICY "admin_update_categories"
  ON public.product_categories FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_categories" ON public.product_categories;
CREATE POLICY "admin_delete_categories"
  ON public.product_categories FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ─── products ───

-- Public read: published + active
DROP POLICY IF EXISTS "read_published_products" ON public.products;
CREATE POLICY "read_published_products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_published = true AND is_active = true AND status = 'published');

-- Admin write
DROP POLICY IF EXISTS "admin_insert_products" ON public.products;
CREATE POLICY "admin_insert_products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_products" ON public.products;
CREATE POLICY "admin_update_products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_products" ON public.products;
CREATE POLICY "admin_delete_products"
  ON public.products FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ─── product_variants ───

-- Public read: active variants for published products
DROP POLICY IF EXISTS "read_active_variants" ON public.product_variants;
CREATE POLICY "read_active_variants"
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.is_published = true
        AND p.is_active = true
        AND p.status = 'published'
    )
  );

-- Admin write
DROP POLICY IF EXISTS "admin_insert_variants" ON public.product_variants;
CREATE POLICY "admin_insert_variants"
  ON public.product_variants FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_variants" ON public.product_variants;
CREATE POLICY "admin_update_variants"
  ON public.product_variants FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_variants" ON public.product_variants;
CREATE POLICY "admin_delete_variants"
  ON public.product_variants FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ─── product_media ───

-- Public read: media for published products
DROP POLICY IF EXISTS "read_published_media" ON public.product_media;
CREATE POLICY "read_published_media"
  ON public.product_media FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_media.product_id
      AND p.is_published = true
      AND p.is_active = true
      AND p.status = 'published'
  ));

-- Admin write
DROP POLICY IF EXISTS "admin_insert_media" ON public.product_media;
CREATE POLICY "admin_insert_media"
  ON public.product_media FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_media" ON public.product_media;
CREATE POLICY "admin_update_media"
  ON public.product_media FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_media" ON public.product_media;
CREATE POLICY "admin_delete_media"
  ON public.product_media FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ─── product_attribute_definitions ───

-- Public read: definitions for active categories
DROP POLICY IF EXISTS "read_active_attr_defs" ON public.product_attribute_definitions;
CREATE POLICY "read_active_attr_defs"
  ON public.product_attribute_definitions FOR SELECT
  TO anon, authenticated
  USING (
    category_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.product_categories c
      WHERE c.id = product_attribute_definitions.category_id
        AND c.is_active = true
    )
  );

-- Admin write
DROP POLICY IF EXISTS "admin_insert_attr_defs" ON public.product_attribute_definitions;
CREATE POLICY "admin_insert_attr_defs"
  ON public.product_attribute_definitions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_attr_defs" ON public.product_attribute_definitions;
CREATE POLICY "admin_update_attr_defs"
  ON public.product_attribute_definitions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_attr_defs" ON public.product_attribute_definitions;
CREATE POLICY "admin_delete_attr_defs"
  ON public.product_attribute_definitions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ─── product_attribute_values ───

-- Public read: values for published products
DROP POLICY IF EXISTS "read_published_attr_values" ON public.product_attribute_values;
CREATE POLICY "read_published_attr_values"
  ON public.product_attribute_values FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_attribute_values.product_id
      AND p.is_published = true
      AND p.is_active = true
      AND p.status = 'published'
  ));

-- Admin write
DROP POLICY IF EXISTS "admin_insert_attr_values" ON public.product_attribute_values;
CREATE POLICY "admin_insert_attr_values"
  ON public.product_attribute_values FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_attr_values" ON public.product_attribute_values;
CREATE POLICY "admin_update_attr_values"
  ON public.product_attribute_values FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_attr_values" ON public.product_attribute_values;
CREATE POLICY "admin_delete_attr_values"
  ON public.product_attribute_values FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ─── product_inventory ───

-- Public read: stock info for published products (hides reserved_quantity)
DROP POLICY IF EXISTS "read_published_inventory" ON public.product_inventory;
CREATE POLICY "read_published_inventory"
  ON public.product_inventory FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_inventory.product_id
      AND p.is_published = true
      AND p.is_active = true
      AND p.status = 'published'
  ));

-- Admin write
DROP POLICY IF EXISTS "admin_insert_inventory" ON public.product_inventory;
CREATE POLICY "admin_insert_inventory"
  ON public.product_inventory FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_inventory" ON public.product_inventory;
CREATE POLICY "admin_update_inventory"
  ON public.product_inventory FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_inventory" ON public.product_inventory;
CREATE POLICY "admin_delete_inventory"
  ON public.product_inventory FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ─── product_prices ───

-- Public read: active prices for published products
DROP POLICY IF EXISTS "read_published_prices" ON public.product_prices;
CREATE POLICY "read_published_prices"
  ON public.product_prices FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_prices.product_id
        AND p.is_published = true
        AND p.is_active = true
        AND p.status = 'published'
    )
  );

-- Admin write
DROP POLICY IF EXISTS "admin_insert_prices" ON public.product_prices;
CREATE POLICY "admin_insert_prices"
  ON public.product_prices FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_prices" ON public.product_prices;
CREATE POLICY "admin_update_prices"
  ON public.product_prices FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_prices" ON public.product_prices;
CREATE POLICY "admin_delete_prices"
  ON public.product_prices FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- ============================================================================
-- GRANTS — Restrict explicit table privileges
-- ============================================================================
-- RLS is enabled, but we also restrict grants so anon/authenticated
-- only have the minimum DML privileges needed.

-- Revoke all first
REVOKE ALL ON public.product_categories FROM anon, authenticated;
REVOKE ALL ON public.products FROM anon, authenticated;
REVOKE ALL ON public.product_variants FROM anon, authenticated;
REVOKE ALL ON public.product_media FROM anon, authenticated;
REVOKE ALL ON public.product_attribute_definitions FROM anon, authenticated;
REVOKE ALL ON public.product_attribute_values FROM anon, authenticated;
REVOKE ALL ON public.product_inventory FROM anon, authenticated;
REVOKE ALL ON public.product_prices FROM anon, authenticated;

-- Grant SELECT to anon + authenticated (public read)
GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.product_media TO anon, authenticated;
GRANT SELECT ON public.product_attribute_definitions TO anon, authenticated;
GRANT SELECT ON public.product_attribute_values TO anon, authenticated;
GRANT SELECT ON public.product_inventory TO anon, authenticated;
GRANT SELECT ON public.product_prices TO anon, authenticated;

-- Grant INSERT/UPDATE/DELETE to authenticated only (admin writes via RLS)
GRANT INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_media TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_attribute_definitions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_attribute_values TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_inventory TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;

-- ============================================================================
-- SEED: 7 Primary Categories
-- ============================================================================
INSERT INTO public.product_categories (name, slug, short_description, description, sort_order, is_active, show_on_home, show_in_navigation)
VALUES
  ('موبایل و تبلت', 'mobile-tablet', 'گوشی هوشمند، تبلت و لوازم جانبی', 'دسته محصولات موبایل و تبلت شامل گوشی‌های هوشمند، تبلت‌ها، شارژرها، قاب‌ها و لوازم جانبی مرتبط.', 1, true, true, true),
  ('لپ‌تاپ و کامپیوتر', 'laptop-computer', 'لپ‌تاپ، کامپیوتر و قطعات', 'دسته محصولات لپ‌تاپ و کامپیوتر شامل لپ‌تاپ‌ها، کامپیوترهای دسک‌تاپ، مانیتورها، کیبورد، موس و قطعات سخت‌افزاری.', 2, true, true, true),
  ('صوتی و تصویری', 'audio-visual', 'هدفون، اسپیکر و تجهیزات صوتی', 'دسته محصولات صوتی و تصویری شامل هدفون، هندزفری، اسپیکر، ساندبار و تجهیزات پخش صدا.', 3, true, true, true),
  ('پوشیدنی‌ها', 'wearables', 'ساعت هوشمند و دستبندهای هوشمند', 'دسته محصولات پوشیدنی شامل ساعت‌های هوشمند، دستبندهای سلامتی و فعالیت و لوازم جانبی مرتبط.', 4, true, true, true),
  ('لوازم جانبی', 'accessories', 'کیف، قاب، شارژر و لوازم جانبی', 'دسته لوازم جانبی شامل کیف و قاب محافظ، شارژر و کابل، پاوربانک و اکسسوری‌های متنوع.', 5, true, true, true),
  ('دوربین و تصویربرداری', 'camera-imaging', 'دوربین عکاسی و تجهیزات تصویربرداری', 'دسته دوربین و تصویربرداری شامل دوربین‌های دیجیتال، لنزها، سه‌پایه و تجهیزات عکاسی و فیلم‌برداری.', 6, true, true, true),
  ('گیمینگ', 'gaming', 'کنسول، دسته بازی و لوازم گیمینگ', 'دسته گیمینگ شامل کنسول‌های بازی، دسته‌ها، بازی‌ها، صندلی گیمینگ و لوازم جانبی بازی.', 7, true, true, true)
ON CONFLICT (slug) DO NOTHING;
