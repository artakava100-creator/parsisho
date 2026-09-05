/*
# Create auction_media table — multi-image gallery for auctions

## Purpose
Extends the auction system from a single `image_url` on the `auctions` table
to a proper gallery of up to 5 images per auction. Image #1 (is_primary = true)
serves as the cover image. The existing `auctions.image_url` column is left
untouched so current auctions continue to work exactly as before.

## New Table: auction_media
- `id` (uuid, primary key, auto-generated)
- `auction_id` (uuid, foreign key → auctions.id ON DELETE CASCADE)
- `media_type` (text, default 'image', CHECK in ('image','video'))
- `url` (text, NOT NULL — the public storage URL)
- `alt_text` (text, nullable)
- `sort_order` (integer, NOT NULL, default 0 — controls display order)
- `is_primary` (boolean, NOT NULL, default false — marks the cover image)
- `created_at` (timestamptz, default now())

## Constraints
1. One primary image per auction — partial unique index on (auction_id) WHERE is_primary = true
2. Maximum 5 media records per auction — enforced via a trigger function that
   raises an exception on INSERT if the auction already has 5 rows. This is
   enforced at the database level (not just application level) so even direct
   SQL inserts or RPCs cannot exceed the limit.

## Indexes
- `auction_media_auction_id_idx` on (auction_id)
- `auction_media_auction_id_sort_idx` on (auction_id, sort_order)
- `auction_media_one_primary_per_auction_idx` — partial unique index enforcing one primary

## Security (RLS)
- RLS enabled on auction_media.
- Public read: anon + authenticated can SELECT all auction_media rows
  (matches the existing `public_read_auctions` policy on the auctions table).
- Admin write: only authenticated users with role 'admin' or 'super_admin' can
  INSERT, UPDATE, DELETE — verified via EXISTS subquery on profiles, matching
  the pattern used by product_media and all other marketplace admin policies.
- No direct table writes for non-admin users; all mutations go through
  admin RPCs or the RLS admin check.

## Important Notes
1. The existing `auctions.image_url` column is NOT modified or removed.
   It remains the source of truth for the homepage hero auction image until
   a later migration migrates data or switches the RPCs to read from auction_media.
2. The 5-image limit is enforced at the database level via a BEFORE INSERT trigger.
   This means the application layer does not need to count rows before inserting —
   the database will reject the 6th insert with a clear error message.
3. The trigger is idempotent: dropping and recreating is safe.
4. All statements use IF NOT EXISTS / DROP IF EXISTS for idempotency.
*/

-- ============================================================
-- 1. Create auction_media table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS auction_media_auction_id_idx
  ON public.auction_media (auction_id);

CREATE INDEX IF NOT EXISTS auction_media_auction_id_sort_idx
  ON public.auction_media (auction_id, sort_order);

-- Only one primary image per auction
CREATE UNIQUE INDEX IF NOT EXISTS auction_media_one_primary_per_auction_idx
  ON public.auction_media (auction_id) WHERE is_primary = true;

-- ============================================================
-- 3. Enforce maximum 5 media records per auction (DB-level)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_auction_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.auction_media
  WHERE auction_id = NEW.auction_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'حداکثر ۵ تصویر برای هر مزایده مجاز است';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_auction_media_limit ON public.auction_media;
CREATE TRIGGER trg_enforce_auction_media_limit
  BEFORE INSERT ON public.auction_media
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_auction_media_limit();

REVOKE EXECUTE ON FUNCTION public.enforce_auction_media_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_auction_media_limit() FROM anon, authenticated;

-- ============================================================
-- 4. Enable RLS
-- ============================================================
ALTER TABLE public.auction_media ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

-- Public read: anyone can view auction media (matches public_read_auctions)
DROP POLICY IF EXISTS "public_read_auction_media" ON public.auction_media;
CREATE POLICY "public_read_auction_media"
  ON public.auction_media FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin insert
DROP POLICY IF EXISTS "admin_insert_auction_media" ON public.auction_media;
CREATE POLICY "admin_insert_auction_media"
  ON public.auction_media FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- Admin update
DROP POLICY IF EXISTS "admin_update_auction_media" ON public.auction_media;
CREATE POLICY "admin_update_auction_media"
  ON public.auction_media FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));

-- Admin delete
DROP POLICY IF EXISTS "admin_delete_auction_media" ON public.auction_media;
CREATE POLICY "admin_delete_auction_media"
  ON public.auction_media FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ));
