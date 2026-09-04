-- Phase 3 DDL: Schema changes only (tables, columns, constraints, indexes, RLS, policies)
-- RPCs were applied in separate migrations

-- ============================================================================
-- 1. PRODUCT_BRANDS table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_brands_slug_idx ON public.product_brands (slug);
CREATE INDEX IF NOT EXISTS product_brands_sort_order_idx ON public.product_brands (sort_order);
CREATE INDEX IF NOT EXISTS product_brands_is_active_idx ON public.product_brands (is_active);

CREATE OR REPLACE FUNCTION public.update_product_brands_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_brands_updated_at_trigger ON public.product_brands;
CREATE TRIGGER update_product_brands_updated_at_trigger
  BEFORE UPDATE ON public.product_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_product_brands_updated_at();

REVOKE EXECUTE ON FUNCTION public.update_product_brands_updated_at() FROM PUBLIC;

ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_active_brands" ON public.product_brands;
CREATE POLICY "read_active_brands"
  ON public.product_brands FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "admin_insert_brands" ON public.product_brands;
CREATE POLICY "admin_insert_brands"
  ON public.product_brands FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_update_brands" ON public.product_brands;
CREATE POLICY "admin_update_brands"
  ON public.product_brands FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admin_delete_brands" ON public.product_brands;
CREATE POLICY "admin_delete_brands"
  ON public.product_brands FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

REVOKE ALL ON public.product_brands FROM anon, authenticated;
GRANT SELECT ON public.product_brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_brands TO authenticated;

-- ============================================================================
-- 2. PRODUCTS — expand status, add publish_at, add brand FK
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'publish_at'
  ) THEN
    ALTER TABLE public.products ADD COLUMN publish_at timestamptz;
  END IF;
END $$;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check1;
ALTER TABLE public.products ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'paused', 'archived'));

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public' AND table_name = 'products'
      AND constraint_name = 'products_brand_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_brand_id_fkey
      FOREIGN KEY (brand_id) REFERENCES public.product_brands(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. PRODUCT_ATTRIBUTE_DEFINITIONS — add is_active
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_attribute_definitions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.product_attribute_definitions
      ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Update public read policy to only show active definitions
DROP POLICY IF EXISTS "read_active_attr_defs" ON public.product_attribute_definitions;
CREATE POLICY "read_active_attr_defs"
  ON public.product_attribute_definitions FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.product_categories c
        WHERE c.id = product_attribute_definitions.category_id
          AND c.is_active = true
      )
    )
  );

-- ============================================================================
-- 4. PRODUCT_VARIANTS — uniqueness on (product_id, attributes)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_product_attributes_idx
  ON public.product_variants (product_id, attributes);

-- ============================================================================
-- 5. HELPER: admin authorization check
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- 6. CATEGORY CYCLE PREVENTION (recursive, no depth limit)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_category_cycle(p_category_id uuid, p_parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_id uuid;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN true;
  END IF;
  IF p_parent_id = p_category_id THEN
    RETURN false;
  END IF;

  current_id := p_parent_id;
  WHILE current_id IS NOT NULL LOOP
    IF current_id = p_category_id THEN
      RETURN false;
    END IF;
    SELECT parent_id INTO current_id FROM public.product_categories WHERE id = current_id;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_category_cycle(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_category_cycle(uuid, uuid) TO authenticated;

-- ============================================================================
-- 7. SCHEDULED PUBLISHING function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.publish_scheduled_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET status = 'published',
      is_published = true,
      is_active = true
  WHERE status = 'scheduled'
    AND publish_at IS NOT NULL
    AND publish_at <= now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_scheduled_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_scheduled_products() TO authenticated;

-- ============================================================================
-- 8. pg_cron scheduled publishing job
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('publish_scheduled_products_job');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'unschedule skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'publish_scheduled_products_job',
      '* * * * *',
      'SELECT public.publish_scheduled_products()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;