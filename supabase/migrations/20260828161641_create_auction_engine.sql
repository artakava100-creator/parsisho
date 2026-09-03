/*
# Create auctions and bids tables with atomic bidding RPC

## Purpose
Build the core auction engine for Parsisho. This migration creates:
1. `auctions` table — one official auction per day
2. `bids` table — all accepted bids with audit trail
3. `place_bid` RPC — atomic, server-authoritative bid placement
4. `finalize_auction` RPC — server-authoritative auction ending
5. `get_auction_detail` RPC — safe auction detail with bid history
6. RLS policies — public read for auctions, restricted bid access
7. Indexes for performance

## Data Model

### auctions
- `id` (uuid PK)
- `title` (text, NOT NULL)
- `slug` (text, UNIQUE) — stable public identifier
- `description` (text, NOT NULL, default empty)
- `status` (text, NOT NULL, default 'draft') — draft|scheduled|live|ended|cancelled
- `auction_date` (date, NOT NULL) — canonical Gregorian date for uniqueness
- `starts_at` (timestamptz, NOT NULL) — when bidding opens
- `ends_at` (timestamptz, NOT NULL) — when bidding closes
- `starting_price` (bigint, NOT NULL) — in toman (integer, no floats)
- `current_price` (bigint, NOT NULL, default = starting_price) — current highest bid
- `min_bid_increment` (bigint, NOT NULL, default 100000) — minimum increment in toman
- `bid_count` (integer, NOT NULL, default 0)
- `winner_user_id` (uuid, nullable) — set when auction ends
- `winning_bid_id` (uuid, nullable) — reference to winning bid
- `image_url` (text, nullable)
- `product_name` (text, nullable) — for future product relation
- `created_at` / `updated_at` (timestamptz)

### bids
- `id` (uuid PK)
- `auction_id` (uuid, FK → auctions, ON DELETE CASCADE)
- `user_id` (uuid, FK → auth.users, ON DELETE CASCADE)
- `amount` (bigint, NOT NULL) — in toman
- `is_winning` (boolean, NOT NULL, default false)
- `created_at` (timestamptz, NOT NULL, default now())
- `bid_sequence` (integer, NOT NULL) — per-auction sequence number

## Money Representation
All monetary values are `bigint` (integer toman). NO floating-point.
This is consistent: database → services → API → UI.

## Unique Daily Auction
`auctions.auction_date` has a UNIQUE constraint — one official auction per day.
The UI converts to Jalali for display; the DB stores Gregorian dates.

## Bid Validation (in place_bid RPC)
1. User is authenticated (auth.uid() not null)
2. Auction exists and status = 'live'
3. Current server time is within auction window (starts_at <= now() <= ends_at)
4. Bid amount > current_price
5. Bid amount >= current_price + min_bid_increment
6. User's profile account_status = 'active'
7. User's email is verified (email_confirmed_at not null)
8. User's phone is verified (phone_verified_at not null)
All checks happen server-side in a single atomic transaction.

## Concurrency Strategy
`place_bid` uses `FOR UPDATE` row-level lock on the auction row within a
transaction. This guarantees two simultaneous bids cannot both succeed
with incorrect values. The first bid commits; the second sees the updated
`current_price` and is validated against it.

## Winner Determination
`finalize_auction` sets auction status to 'ended', finds the highest bid,
marks it as winning, sets winner_user_id and winning_bid_id. Idempotent —
running it twice on an already-ended auction is a no-op.

## RLS Policies

### auctions
- SELECT: public (anon + authenticated) — auctions are publicly viewable
- INSERT/UPDATE/DELETE: NONE — only admins via service role or RPC can modify

### bids
- SELECT: authenticated users can see bids for any auction (bid history is public
  to authenticated users, but private bidder identity is masked)
- INSERT: NONE — bids are only created via the `place_bid` RPC
- UPDATE/DELETE: NONE — bids are immutable once accepted

## Security Notes
1. Users CANNOT directly INSERT into bids — only the `place_bid` RPC creates bids
2. Users CANNOT modify auction status, current_price, winner, etc.
3. The `place_bid` RPC derives user_id from auth.uid() — never trusts client input
4. All validation happens server-side
5. Bid history shows masked bidder names (first name + last initial)
*/

-- ============================================================
-- 1. Create auctions table
-- ============================================================
CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  auction_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  starting_price bigint NOT NULL,
  current_price bigint NOT NULL,
  min_bid_increment bigint NOT NULL DEFAULT 100000,
  bid_count integer NOT NULL DEFAULT 0,
  winner_user_id uuid,
  winning_bid_id uuid,
  image_url text,
  product_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Constraints on auctions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_status_check'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT auctions_status_check
    CHECK (status IN ('draft', 'scheduled', 'live', 'ended', 'cancelled'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_starting_price_check'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT auctions_starting_price_check
    CHECK (starting_price > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_current_price_check'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT auctions_current_price_check
    CHECK (current_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_min_increment_check'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT auctions_min_increment_check
    CHECK (min_bid_increment > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_time_range_check'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT auctions_time_range_check
    CHECK (ends_at > starts_at);
  END IF;
END $$;

-- Unique official auction per day
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_auction_date_unique'
  ) THEN
    ALTER TABLE auctions ADD CONSTRAINT auctions_auction_date_unique
    UNIQUE (auction_date);
  END IF;
END $$;

-- ============================================================
-- 3. Create bids table
-- ============================================================
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  is_winning boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  bid_sequence integer NOT NULL
);

-- ============================================================
-- 4. Constraints on bids
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bids_amount_check'
  ) THEN
    ALTER TABLE bids ADD CONSTRAINT bids_amount_check
    CHECK (amount > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bids_auction_user_unique_seq'
  ) THEN
    ALTER TABLE bids ADD CONSTRAINT bids_auction_user_unique_seq
    UNIQUE (auction_id, bid_sequence);
  END IF;
END $$;

-- ============================================================
-- 5. Indexes
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auctions_status'
  ) THEN
    CREATE INDEX idx_auctions_status ON auctions(status);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auctions_auction_date'
  ) THEN
    CREATE INDEX idx_auctions_auction_date ON auctions(auction_date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_auctions_starts_at'
  ) THEN
    CREATE INDEX idx_auctions_starts_at ON auctions(starts_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bids_auction_id'
  ) THEN
    CREATE INDEX idx_bids_auction_id ON bids(auction_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bids_created_at'
  ) THEN
    CREATE INDEX idx_bids_created_at ON bids(created_at);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bids_user_id'
  ) THEN
    CREATE INDEX idx_bids_user_id ON bids(user_id);
  END IF;
END $$;

-- ============================================================
-- 6. Enable RLS
-- ============================================================
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS Policies — auctions (public read, no direct write)
-- ============================================================
DROP POLICY IF EXISTS "public_read_auctions" ON auctions;
CREATE POLICY "public_read_auctions"
ON auctions FOR SELECT
TO anon, authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — auctions are managed via service role or RPC

-- ============================================================
-- 8. RLS Policies — bids (authenticated read, no direct write)
-- ============================================================
DROP POLICY IF EXISTS "authenticated_read_bids" ON bids;
CREATE POLICY "authenticated_read_bids"
ON bids FOR SELECT
TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — bids are only created via place_bid RPC

-- ============================================================
-- 9. Updated_at trigger for auctions
-- ============================================================
CREATE OR REPLACE FUNCTION update_auctions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auctions_updated_at ON auctions;
CREATE TRIGGER trg_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_auctions_updated_at();

-- ============================================================
-- 10. Revoke EXECUTE on trigger functions from anon/authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION update_auctions_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_auctions_updated_at() FROM anon, authenticated;

-- ============================================================
-- 11. place_bid RPC — atomic, server-authoritative bid placement
-- ============================================================
CREATE OR REPLACE FUNCTION place_bid(p_auction_id uuid, p_amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_user_email text;
  v_email_confirmed timestamptz;
  v_bid_sequence integer;
  v_min_bid bigint;
  v_result jsonb;
BEGIN
  -- 1. Verify authentication
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده وارد حساب خود شوید');
  END IF;

  -- 2. Verify amount is positive
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ پیشنهاد نامعتبر است');
  END IF;

  -- 3. Lock the auction row for the duration of this transaction
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  -- 4. Verify auction exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  -- 5. Verify auction is live
  IF v_auction.status != 'live' THEN
    IF v_auction.status = 'draft' OR v_auction.status = 'scheduled' THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز شروع نشده است');
    ELSIF v_auction.status = 'ended' THEN
      RETURN jsonb_build_object('success', false, 'error', 'مزایده به پایان رسیده است');
    ELSIF v_auction.status = 'cancelled' THEN
      RETURN jsonb_build_object('success', false, 'error', 'این مزایده لغو شده است');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'مزایده در وضعیت نامعتبر است');
  END IF;

  -- 6. Verify current server time is within auction window
  IF now() < v_auction.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز شروع نشده است');
  END IF;
  IF now() > v_auction.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده به پایان رسیده است');
  END IF;

  -- 7. Verify bid amount meets minimum
  v_min_bid := v_auction.current_price + v_auction.min_bid_increment;
  IF p_amount < v_min_bid THEN
    RETURN jsonb_build_object('success', false, 'error', 'حداقل پیشنهاد مجاز: ' || v_min_bid::text || ' تومان');
  END IF;

  -- 8. Fetch user profile for eligibility checks
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = auth.uid();

  -- 9. Verify account status
  IF NOT FOUND OR v_profile.account_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'حساب شما در حال حاضر اجازه شرکت در مزایده را ندارد');
  END IF;

  -- 10. Verify email is confirmed (from auth.users)
  SELECT email, email_confirmed_at INTO v_user_email, v_email_confirmed
  FROM auth.users
  WHERE id = auth.uid();

  IF v_email_confirmed IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا ایمیل خود را تأیید کنید');
  END IF;

  -- 11. Verify phone is verified
  IF v_profile.phone_verified_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در مزایده ابتدا شماره موبایل خود را تأیید کنید');
  END IF;

  -- 12. Get next bid sequence number
  SELECT COALESCE(MAX(bid_sequence), 0) + 1 INTO v_bid_sequence
  FROM bids
  WHERE auction_id = p_auction_id;

  -- 13. Insert the bid
  INSERT INTO bids (auction_id, user_id, amount, bid_sequence)
  VALUES (p_auction_id, auth.uid(), p_amount, v_bid_sequence);

  -- 14. Update auction current price and bid count
  UPDATE auctions
  SET current_price = p_amount,
      bid_count = bid_count + 1
  WHERE id = p_auction_id;

  -- 15. Return success with updated state
  RETURN jsonb_build_object(
    'success', true,
    'auction_id', p_auction_id,
    'new_current_price', p_amount,
    'new_bid_count', v_auction.bid_count + 1,
    'bid_sequence', v_bid_sequence
  );
END;
$$;

-- Revoke direct execution from anon/authenticated
REVOKE EXECUTE ON FUNCTION place_bid(uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION place_bid(uuid, bigint) FROM anon, authenticated;

-- ============================================================
-- 12. finalize_auction RPC — server-authoritative auction ending
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_auction(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_winning_bid bids%ROWTYPE;
BEGIN
  -- Lock the auction row
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  -- Idempotent: if already ended, return current state
  IF v_auction.status = 'ended' THEN
    RETURN jsonb_build_object('success', true, 'already_ended', true, 'winner_user_id', v_auction.winner_user_id);
  END IF;

  -- Only finalize live auctions
  IF v_auction.status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده در وضعیت نامعتبر است');
  END IF;

  -- Set status to ended
  UPDATE auctions SET status = 'ended' WHERE id = p_auction_id;

  -- Find the highest bid (deterministic: highest amount, then earliest created_at)
  SELECT * INTO v_winning_bid
  FROM bids
  WHERE auction_id = p_auction_id
  ORDER BY amount DESC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    -- Mark the winning bid
    UPDATE bids SET is_winning = true WHERE id = v_winning_bid.id;

    -- Set winner on auction
    UPDATE auctions
    SET winner_user_id = v_winning_bid.user_id,
        winning_bid_id = v_winning_bid.id
    WHERE id = p_auction_id;

    RETURN jsonb_build_object(
      'success', true,
      'winner_user_id', v_winning_bid.user_id,
      'winning_bid_id', v_winning_bid.id,
      'winning_amount', v_winning_bid.amount
    );
  ELSE
    -- No bids placed
    RETURN jsonb_build_object('success', true, 'no_bids', true);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM anon, authenticated;

-- ============================================================
-- 13. get_auction_detail RPC — safe auction detail with bid history
--     Returns auction data + masked bid history (no emails/phones)
-- ============================================================
CREATE OR REPLACE FUNCTION get_auction_detail(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_bids jsonb;
  v_result jsonb;
BEGIN
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  -- Get bid history with masked bidder names
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'amount', b.amount,
      'bidder_name', CASE
        WHEN LENGTH(p.display_name) > 0 THEN
          CASE
            WHEN POSITION(' ' IN p.display_name) > 0 THEN
              LEFT(p.display_name, POSITION(' ' IN p.display_name) - 1) || ' ' || LEFT(SPLIT_PART(p.display_name, ' ', 2), 1) || '.'
            ELSE
              LEFT(p.display_name, 3) || '***'
          END
        ELSE 'کاربر پارسیشو'
      END,
      'is_winning', b.is_winning,
      'created_at', b.created_at,
      'bid_sequence', b.bid_sequence,
      'is_own_bid', b.user_id = auth.uid()
    )
    ORDER BY b.amount DESC, b.created_at ASC
  ), '[]'::jsonb) INTO v_bids
  FROM bids b
  LEFT JOIN profiles p ON p.id = b.user_id
  WHERE b.auction_id = p_auction_id;

  RETURN jsonb_build_object(
    'success', true,
    'auction', jsonb_build_object(
      'id', v_auction.id,
      'title', v_auction.title,
      'slug', v_auction.slug,
      'description', v_auction.description,
      'status', v_auction.status,
      'auction_date', v_auction.auction_date,
      'starts_at', v_auction.starts_at,
      'ends_at', v_auction.ends_at,
      'starting_price', v_auction.starting_price,
      'current_price', v_auction.current_price,
      'min_bid_increment', v_auction.min_bid_increment,
      'bid_count', v_auction.bid_count,
      'winner_user_id', v_auction.winner_user_id,
      'image_url', v_auction.image_url,
      'product_name', v_auction.product_name,
      'created_at', v_auction.created_at
    ),
    'bids', v_bids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_auction_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_auction_detail(uuid) FROM anon, authenticated;

-- ============================================================
-- 14. Grant EXECUTE on RPCs to authenticated users
--    place_bid, get_auction_detail: authenticated only
--    finalize_auction: service role only (not granted to any role)
-- ============================================================
GRANT EXECUTE ON FUNCTION place_bid(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auction_detail(uuid) TO anon, authenticated;
