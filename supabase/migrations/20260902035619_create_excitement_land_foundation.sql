/*
# Excitement Land — Database & Security Foundation (Phase 1)

## Purpose
Create the complete database foundation for the "Excitement Land / سرزمین هیجان"
feature. This phase is schema + security only — no UI, no game logic, no generic
play_game() RPC. Three future games are supported: Guess It (حدس بزن), Lucky Wheel
(گردونه شانس), and Gol Ya Poch (گل یا پوچ).

## 1. New Tables

### games
Catalog of available Excitement Land games.
- `id` (uuid, PK)
- `slug` (text, UNIQUE) — machine-readable identifier (guess_it, lucky_wheel, gol_ya_poch)
- `name` (text, NOT NULL) — human-readable name
- `description` (text, default '')
- `game_type` (text, NOT NULL) — CHECK constraint: guess_it | lucky_wheel | gol_ya_poch
- `active` (boolean, NOT NULL, DEFAULT false)
- `entry_fee` (bigint, NOT NULL, DEFAULT 0) — CHECK >= 0
- `config` (jsonb, DEFAULT '{}') — game-type-specific configuration
- `created_at` / `updated_at` (timestamptz)

### game_rounds
An actual contest/round (primarily for Guess It, but extensible).
- `id` (uuid, PK)
- `game_id` (uuid, FK → games, ON DELETE CASCADE)
- `title` (text, NOT NULL)
- `question` (text, NOT NULL)
- `challenge_type` (text, NOT NULL) — extensible: image_count, 3d_object, hidden_object, visual_identification, text_question, etc.
- `display_image_path` (text, nullable) — the asset shown to users
- `original_image_path` (text, nullable) — ADMIN-ONLY private asset (the answer-revealing image)
- `answer_type` (text, NOT NULL) — CHECK: text | number
- `correct_answer` (text, NOT NULL) — SERVER-SIDE ONLY, never exposed via user SELECT policies
- `accepted_answers` (text[], DEFAULT '{}') — additional acceptable answers, SERVER-SIDE ONLY
- `entry_fee` (bigint, NOT NULL, DEFAULT 0, CHECK >= 0)
- `prize_amount` (bigint, NOT NULL, DEFAULT 0, CHECK >= 0)
- `winner_count` (integer, NOT NULL, DEFAULT 1, CHECK > 0)
- `max_entries_per_user` (integer, NOT NULL, DEFAULT 1, CHECK > 0)
- `starts_at` (timestamptz, NOT NULL)
- `ends_at` (timestamptz, NOT NULL) — CHECK ends_at > starts_at
- `status` (text, NOT NULL, DEFAULT 'draft') — CHECK: draft | scheduled | active | ended | cancelled | drawn
- `created_by` (uuid, FK → auth.users, ON DELETE SET NULL)
- `created_at` / `updated_at` (timestamptz)

### game_entries
One row = one user's participation in a round.
- `id` (uuid, PK)
- `game_id` (uuid, FK → games, ON DELETE CASCADE)
- `round_id` (uuid, nullable, FK → game_rounds, ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, FK → auth.users, ON DELETE CASCADE)
- `entry_fee` (bigint, NOT NULL, DEFAULT 0, CHECK >= 0)
- `wallet_transaction_id` (uuid, nullable, FK → wallet_transactions, ON DELETE SET NULL)
- `submitted_answer` (text, nullable)
- `qualification_status` (text, NOT NULL, DEFAULT 'pending') — CHECK: pending | qualified | not_qualified
- `idempotency_key` (text, nullable) — replay protection: UNIQUE per (round_id, user_id, idempotency_key)
- `created_at` (timestamptz)
- Partial unique index on (round_id, user_id) enforces max_entries_per_user = 1 at DB level

### game_results
Authoritative server-side result per entry.
- `id` (uuid, PK)
- `entry_id` (uuid, FK → game_entries, ON DELETE CASCADE)
- `result_type` (text, NOT NULL) — CHECK: correct | incorrect | qualified | win | lose | no_reward
- `is_correct` (boolean, nullable)
- `reward_amount` (bigint, NOT NULL, DEFAULT 0, CHECK >= 0)
- `reward_transaction_id` (uuid, nullable, FK → wallet_transactions, ON DELETE SET NULL)
- `result_data` (jsonb, DEFAULT '{}')
- `created_at` (timestamptz)

### game_draws
Raffle/draw for Guess It rounds (correct answers qualify for a later draw).
- `id` (uuid, PK)
- `round_id` (uuid, FK → game_rounds, ON DELETE CASCADE)
- `status` (text, NOT NULL, DEFAULT 'pending') — CHECK: pending | completed | cancelled
- `winner_count` (integer, NOT NULL, DEFAULT 0, CHECK >= 0)
- `executed_at` (timestamptz, nullable)
- `executed_by` (uuid, nullable, FK → auth.users, ON DELETE SET NULL)
- `created_at` (timestamptz)
- UNIQUE on round_id — only one draw per round

### game_winners
Winners of a draw.
- `id` (uuid, PK)
- `draw_id` (uuid, FK → game_draws, ON DELETE CASCADE)
- `round_id` (uuid, FK → game_rounds, ON DELETE CASCADE)
- `entry_id` (uuid, FK → game_entries, ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, FK → auth.users, ON DELETE CASCADE)
- `prize_amount` (bigint, NOT NULL, DEFAULT 0, CHECK >= 0)
- `wallet_transaction_id` (uuid, nullable, FK → wallet_transactions, ON DELETE SET NULL)
- `created_at` (timestamptz)
- UNIQUE on (draw_id, entry_id) — no duplicate winners

## 2. Wallet Transaction Type Extension
The existing `wallet_transactions.type` CHECK constraint is replaced with an
expanded version that includes all existing types PLUS `game_entry` and
`game_reward`. No existing types are removed or renamed.

## 3. Security (RLS)

### games
- SELECT: public (anyone can see the game catalog) — TO anon, authenticated
- INSERT/UPDATE/DELETE: admin only (via is_admin())

### game_rounds
- SELECT: admin-only (protects correct_answer, accepted_answers, original_image_path)
- Users access round data via the get_public_game_rounds() RPC which excludes private columns
- INSERT/UPDATE/DELETE: admin only

### game_entries
- SELECT: users read only their own entries
- No direct INSERT/UPDATE/DELETE for users — all via SECURITY DEFINER RPCs

### game_results
- SELECT: users read only results for their own entries
- No direct INSERT/UPDATE/DELETE — server-side only

### game_draws
- SELECT/INSERT/UPDATE/DELETE: admin only

### game_winners
- SELECT: users read their own winning records
- No direct INSERT/UPDATE/DELETE — server-side only

## 4. RPCs / Functions

### is_admin() — already exists from prior migration, not recreated.

### get_public_game_rounds() — SECURITY DEFINER
Returns non-draft rounds WITHOUT private columns (correct_answer, accepted_answers,
original_image_path). This is the user-facing API for round data.

### create_game_round() — SECURITY DEFINER, admin-only
Creates a new game round in 'draft' status.

### update_game_round() — SECURITY DEFINER, admin-only
Updates editable fields on a draft round.

### set_game_round_status() — SECURITY DEFINER, admin-only
Transitions round status through the state machine:
  draft → scheduled → active → ended → drawn
  draft/scheduled/active → cancelled

## 5. Idempotency
game_entries has an `idempotency_key` column with a UNIQUE partial index
on (round_id, user_id, idempotency_key) WHERE idempotency_key IS NOT NULL.
A repeated request with the same key hits the unique constraint and does
not create a duplicate entry or charge the user twice.

A partial UNIQUE index on (round_id, user_id) WHERE idempotency_key IS NULL
enforces max_entries_per_user = 1 at the database level.

## 6. Indexes
- idx_games_active: active game lookup
- idx_game_rounds_game_id: rounds by game
- idx_game_rounds_status: active/scheduled rounds
- idx_game_rounds_starts_ends: time-based queries
- idx_game_entries_user_id: user game history
- idx_game_entries_round_id: round participants
- idx_game_entries_round_user: qualified participant lookup
- idx_game_entries_qualification: qualified participants
- idx_game_results_entry_id: result lookup by entry
- idx_game_draws_round_id: draw lookup by round
- idx_game_winners_draw_id: winners by draw
- idx_game_winners_user_id: user's winning history
- idx_game_winners_round_id: winners by round

## 7. Seed Data
Three static game definitions inserted (inactive by default):
  guess_it, lucky_wheel, gol_ya_poch
No fake users, entries, results, draws, winners, or transactions.

## 8. Important Notes
1. No existing wallet/auction/auth functionality is modified.
2. The wallet_transactions type CHECK is extended (not replaced) to add
   game_entry and game_reward while preserving all existing types.
3. Correct answers and original images are NEVER exposed to users —
   protected by RLS (admin-only direct SELECT on game_rounds) and by the
   get_public_game_rounds() RPC which omits them.
4. All financial mutations remain server-side via SECURITY DEFINER.
5. No generic play_game() RPC is created.
6. No frontend/UI changes in this phase.
*/

-- ============================================================
-- 1. Extend wallet_transactions type CHECK to include game types
--    Preserves ALL existing types and adds game_entry, game_reward.
-- ============================================================
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_type_check'
  ) THEN
    ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_type_check;
  END IF;
  ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
    CHECK (type IN (
      'deposit', 'withdrawal', 'auction_bid', 'auction_click', 'auction_refund',
      'direct_purchase', 'reward', 'daily_reward', 'referral_reward',
      'admin_adjustment', 'game_entry', 'game_reward'
    ));
END $$;

-- ============================================================
-- 2. Create games table
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  game_type text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  entry_fee bigint NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_slug_key'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_game_type_check'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_game_type_check
      CHECK (game_type IN ('guess_it', 'lucky_wheel', 'gol_ya_poch'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_entry_fee_check'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_entry_fee_check
      CHECK (entry_fee >= 0);
  END IF;
END $$;

-- ============================================================
-- 3. Create game_rounds table
-- ============================================================
CREATE TABLE IF NOT EXISTS game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title text NOT NULL,
  question text NOT NULL,
  challenge_type text NOT NULL,
  display_image_path text,
  original_image_path text,
  answer_type text NOT NULL,
  correct_answer text NOT NULL,
  accepted_answers text[] NOT NULL DEFAULT '{}'::text[],
  entry_fee bigint NOT NULL DEFAULT 0,
  prize_amount bigint NOT NULL DEFAULT 0,
  winner_count integer NOT NULL DEFAULT 1,
  max_entries_per_user integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_answer_type_check'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_answer_type_check
      CHECK (answer_type IN ('text', 'number'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_status_check'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_status_check
      CHECK (status IN ('draft', 'scheduled', 'active', 'ended', 'cancelled', 'drawn'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_entry_fee_check'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_entry_fee_check
      CHECK (entry_fee >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_prize_amount_check'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_prize_amount_check
      CHECK (prize_amount >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_winner_count_check'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_winner_count_check
      CHECK (winner_count > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_max_entries_check'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_max_entries_check
      CHECK (max_entries_per_user > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_rounds_time_range_check'
  ) THEN
    ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_time_range_check
      CHECK (ends_at > starts_at);
  END IF;
END $$;

-- ============================================================
-- 4. Create game_entries table
-- ============================================================
CREATE TABLE IF NOT EXISTS game_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_id uuid REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_fee bigint NOT NULL DEFAULT 0,
  wallet_transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  submitted_answer text,
  qualification_status text NOT NULL DEFAULT 'pending',
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_entries_entry_fee_check'
  ) THEN
    ALTER TABLE game_entries ADD CONSTRAINT game_entries_entry_fee_check
      CHECK (entry_fee >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_entries_qualification_status_check'
  ) THEN
    ALTER TABLE game_entries ADD CONSTRAINT game_entries_qualification_status_check
      CHECK (qualification_status IN ('pending', 'qualified', 'not_qualified'));
  END IF;
END $$;

-- Partial unique index: one entry per (round_id, user_id) when no idempotency key.
-- Enforces max_entries_per_user = 1 at the DB level for single-entry rounds.
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_entries_round_user_unique
  ON game_entries (round_id, user_id)
  WHERE round_id IS NOT NULL AND idempotency_key IS NULL;

-- Idempotency: same (round_id, user_id, idempotency_key) cannot be inserted twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_entries_idempotency
  ON game_entries (round_id, user_id, idempotency_key)
  WHERE round_id IS NOT NULL AND idempotency_key IS NOT NULL;

-- ============================================================
-- 5. Create game_results table
-- ============================================================
CREATE TABLE IF NOT EXISTS game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES game_entries(id) ON DELETE CASCADE,
  result_type text NOT NULL,
  is_correct boolean,
  reward_amount bigint NOT NULL DEFAULT 0,
  reward_transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_results_result_type_check'
  ) THEN
    ALTER TABLE game_results ADD CONSTRAINT game_results_result_type_check
      CHECK (result_type IN ('correct', 'incorrect', 'qualified', 'win', 'lose', 'no_reward'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_results_reward_amount_check'
  ) THEN
    ALTER TABLE game_results ADD CONSTRAINT game_results_reward_amount_check
      CHECK (reward_amount >= 0);
  END IF;
END $$;

-- ============================================================
-- 6. Create game_draws table
-- ============================================================
CREATE TABLE IF NOT EXISTS game_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  winner_count integer NOT NULL DEFAULT 0,
  executed_at timestamptz,
  executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_draws_status_check'
  ) THEN
    ALTER TABLE game_draws ADD CONSTRAINT game_draws_status_check
      CHECK (status IN ('pending', 'completed', 'cancelled'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_draws_winner_count_check'
  ) THEN
    ALTER TABLE game_draws ADD CONSTRAINT game_draws_winner_count_check
      CHECK (winner_count >= 0);
  END IF;
END $$;

-- Only one draw per round
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_draws_round_id_key'
  ) THEN
    ALTER TABLE game_draws ADD CONSTRAINT game_draws_round_id_key UNIQUE (round_id);
  END IF;
END $$;

-- ============================================================
-- 7. Create game_winners table
-- ============================================================
CREATE TABLE IF NOT EXISTS game_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES game_draws(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES game_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_amount bigint NOT NULL DEFAULT 0,
  wallet_transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_winners_prize_amount_check'
  ) THEN
    ALTER TABLE game_winners ADD CONSTRAINT game_winners_prize_amount_check
      CHECK (prize_amount >= 0);
  END IF;
END $$;

-- No duplicate winners for the same draw/entry
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_winners_draw_entry_key'
  ) THEN
    ALTER TABLE game_winners ADD CONSTRAINT game_winners_draw_entry_key UNIQUE (draw_id, entry_id);
  END IF;
END $$;

-- ============================================================
-- 8. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_games_active ON games (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_game_rounds_game_id ON game_rounds (game_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON game_rounds (status);
CREATE INDEX IF NOT EXISTS idx_game_rounds_starts_ends ON game_rounds (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_game_entries_user_id ON game_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_game_entries_round_id ON game_entries (round_id);
CREATE INDEX IF NOT EXISTS idx_game_entries_round_user ON game_entries (round_id, user_id);
CREATE INDEX IF NOT EXISTS idx_game_entries_qualification ON game_entries (qualification_status) WHERE qualification_status = 'qualified';
CREATE INDEX IF NOT EXISTS idx_game_results_entry_id ON game_results (entry_id);
CREATE INDEX IF NOT EXISTS idx_game_draws_round_id ON game_draws (round_id);
CREATE INDEX IF NOT EXISTS idx_game_winners_draw_id ON game_winners (draw_id);
CREATE INDEX IF NOT EXISTS idx_game_winners_user_id ON game_winners (user_id);
CREATE INDEX IF NOT EXISTS idx_game_winners_round_id ON game_winners (round_id);

-- ============================================================
-- 9. Enable RLS on all new tables
-- ============================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_winners ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. RLS Policies — games
--     Public read of game catalog; admin-only writes.
-- ============================================================
DROP POLICY IF EXISTS "games_select_public" ON games;
CREATE POLICY "games_select_public"
  ON games FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "games_insert_admin" ON games;
CREATE POLICY "games_insert_admin"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "games_update_admin" ON games;
CREATE POLICY "games_update_admin"
  ON games FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "games_delete_admin" ON games;
CREATE POLICY "games_delete_admin"
  ON games FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- 11. RLS Policies — game_rounds
--     Direct SELECT is admin-only (protects correct_answer,
--     accepted_answers, original_image_path).
--     Users access round data via get_public_game_rounds() RPC.
--     All writes are admin-only.
-- ============================================================
DROP POLICY IF EXISTS "game_rounds_select_admin" ON game_rounds;
CREATE POLICY "game_rounds_select_admin"
  ON game_rounds FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "game_rounds_insert_admin" ON game_rounds;
CREATE POLICY "game_rounds_insert_admin"
  ON game_rounds FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "game_rounds_update_admin" ON game_rounds;
CREATE POLICY "game_rounds_update_admin"
  ON game_rounds FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "game_rounds_delete_admin" ON game_rounds;
CREATE POLICY "game_rounds_delete_admin"
  ON game_rounds FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- 12. RLS Policies — game_entries
--     Users read only their own entries.
--     No direct INSERT/UPDATE/DELETE for users — all via RPCs.
-- ============================================================
DROP POLICY IF EXISTS "game_entries_select_own" ON game_entries;
CREATE POLICY "game_entries_select_own"
  ON game_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 13. RLS Policies — game_results
--     Users read only results for their own entries.
--     No direct INSERT/UPDATE/DELETE — server-side only.
-- ============================================================
DROP POLICY IF EXISTS "game_results_select_own" ON game_results;
CREATE POLICY "game_results_select_own"
  ON game_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_entries
      WHERE game_entries.id = game_results.entry_id
        AND game_entries.user_id = auth.uid()
    )
  );

-- ============================================================
-- 14. RLS Policies — game_draws
--     Admin-only: users do not see draws directly.
-- ============================================================
DROP POLICY IF EXISTS "game_draws_select_admin" ON game_draws;
CREATE POLICY "game_draws_select_admin"
  ON game_draws FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "game_draws_insert_admin" ON game_draws;
CREATE POLICY "game_draws_insert_admin"
  ON game_draws FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "game_draws_update_admin" ON game_draws;
CREATE POLICY "game_draws_update_admin"
  ON game_draws FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "game_draws_delete_admin" ON game_draws;
CREATE POLICY "game_draws_delete_admin"
  ON game_draws FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- 15. RLS Policies — game_winners
--     Users read their own winning records.
--     No direct INSERT/UPDATE/DELETE — server-side only.
-- ============================================================
DROP POLICY IF EXISTS "game_winners_select_own" ON game_winners;
CREATE POLICY "game_winners_select_own"
  ON game_winners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 16. get_public_game_rounds() RPC
--     Returns non-draft rounds WITHOUT private columns:
--       correct_answer, accepted_answers, original_image_path
--     This is the user-facing API for round data.
-- ============================================================
CREATE OR REPLACE FUNCTION get_public_game_rounds()
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', gr.id,
    'game_id', gr.game_id,
    'title', gr.title,
    'question', gr.question,
    'challenge_type', gr.challenge_type,
    'display_image_path', gr.display_image_path,
    'answer_type', gr.answer_type,
    'entry_fee', gr.entry_fee,
    'prize_amount', gr.prize_amount,
    'winner_count', gr.winner_count,
    'max_entries_per_user', gr.max_entries_per_user,
    'starts_at', gr.starts_at,
    'ends_at', gr.ends_at,
    'status', gr.status,
    'created_at', gr.created_at
  )
  FROM game_rounds gr
  WHERE gr.status IN ('scheduled', 'active', 'ended', 'drawn')
    AND gr.starts_at <= now()
  ORDER BY gr.starts_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION get_public_game_rounds() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_public_game_rounds() FROM anon;
GRANT EXECUTE ON FUNCTION get_public_game_rounds() TO authenticated;

-- ============================================================
-- 17. Updated_at triggers for new tables
-- ============================================================
CREATE OR REPLACE FUNCTION update_games_updated_at()
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

DROP TRIGGER IF EXISTS trg_games_updated_at ON games;
CREATE TRIGGER trg_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_updated_at();

REVOKE EXECUTE ON FUNCTION update_games_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_games_updated_at() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION update_game_rounds_updated_at()
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

DROP TRIGGER IF EXISTS trg_game_rounds_updated_at ON game_rounds;
CREATE TRIGGER trg_game_rounds_updated_at
  BEFORE UPDATE ON game_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_game_rounds_updated_at();

REVOKE EXECUTE ON FUNCTION update_game_rounds_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_game_rounds_updated_at() FROM anon, authenticated;

-- ============================================================
-- 18. Admin RPC: create_game_round()
-- ============================================================
CREATE OR REPLACE FUNCTION create_game_round(
  p_game_id uuid,
  p_title text,
  p_question text,
  p_challenge_type text,
  p_answer_type text,
  p_correct_answer text,
  p_display_image_path text DEFAULT NULL,
  p_original_image_path text DEFAULT NULL,
  p_accepted_answers text[] DEFAULT ARRAY[]::text[],
  p_entry_fee bigint DEFAULT 0,
  p_prize_amount bigint DEFAULT 0,
  p_winner_count integer DEFAULT 1,
  p_max_entries_per_user integer DEFAULT 1,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round_id uuid;
  v_game games%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای ایجاد دور بازی وارد حساب خود شوید');
  END IF;

  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ایجاد دور بازی ندارید');
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'عنوان دور الزامی است');
  END IF;

  IF p_question IS NULL OR length(trim(p_question)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'سوال دور الزامی است');
  END IF;

  IF p_challenge_type IS NULL OR length(trim(p_challenge_type)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع چالش الزامی است');
  END IF;

  IF p_answer_type NOT IN ('text', 'number') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع پاسخ نامعتبر است');
  END IF;

  IF p_correct_answer IS NULL OR length(trim(p_correct_answer)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'پاسخ صحیح الزامی است');
  END IF;

  IF p_entry_fee < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'هزینه ورود نمی‌تواند منفی باشد');
  END IF;

  IF p_prize_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ جایزه نمی‌تواند منفی باشد');
  END IF;

  IF p_winner_count <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'تعداد برندگان باید بیشتر از صفر باشد');
  END IF;

  IF p_max_entries_per_user <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'حداکثر شرکت در هر کاربر باید بیشتر از صفر باشد');
  END IF;

  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'بازی پیدا نشد');
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_ends_at <= p_starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'زمان پایان باید بعد از زمان شروع باشد');
  END IF;

  INSERT INTO game_rounds (
    game_id, title, question, challenge_type,
    display_image_path, original_image_path,
    answer_type, correct_answer, accepted_answers,
    entry_fee, prize_amount, winner_count, max_entries_per_user,
    starts_at, ends_at, status, created_by
  )
  VALUES (
    p_game_id, p_title, p_question, p_challenge_type,
    p_display_image_path, p_original_image_path,
    p_answer_type, p_correct_answer, p_accepted_answers,
    p_entry_fee, p_prize_amount, p_winner_count, p_max_entries_per_user,
    COALESCE(p_starts_at, now() + interval '1 hour'),
    COALESCE(p_ends_at, now() + interval '25 hours'),
    'draft', auth.uid()
  )
  RETURNING id INTO v_round_id;

  RETURN jsonb_build_object('success', true, 'round_id', v_round_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION create_game_round FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_game_round FROM anon;
GRANT EXECUTE ON FUNCTION create_game_round TO authenticated;

-- ============================================================
-- 19. Admin RPC: update_game_round()
--     Only draft rounds are editable.
-- ============================================================
CREATE OR REPLACE FUNCTION update_game_round(
  p_round_id uuid,
  p_title text DEFAULT NULL,
  p_question text DEFAULT NULL,
  p_challenge_type text DEFAULT NULL,
  p_display_image_path text DEFAULT NULL,
  p_original_image_path text DEFAULT NULL,
  p_answer_type text DEFAULT NULL,
  p_correct_answer text DEFAULT NULL,
  p_accepted_answers text[] DEFAULT NULL,
  p_entry_fee bigint DEFAULT NULL,
  p_prize_amount bigint DEFAULT NULL,
  p_winner_count integer DEFAULT NULL,
  p_max_entries_per_user integer DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round game_rounds%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای ویرایش دور بازی وارد حساب خود شوید');
  END IF;

  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ویرایش دور بازی ندارید');
  END IF;

  SELECT * INTO v_round FROM game_rounds WHERE id = p_round_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'دور بازی پیدا نشد');
  END IF;

  IF v_round.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط دورهای پیش‌نویس قابل ویرایش هستند');
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_ends_at <= p_starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'زمان پایان باید بعد از زمان شروع باشد');
  END IF;

  IF p_entry_fee IS NOT NULL AND p_entry_fee < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'هزینه ورود نمی‌تواند منفی باشد');
  END IF;

  IF p_prize_amount IS NOT NULL AND p_prize_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ جایزه نمی‌تواند منفی باشد');
  END IF;

  IF p_winner_count IS NOT NULL AND p_winner_count <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'تعداد برندگان باید بیشتر از صفر باشد');
  END IF;

  IF p_max_entries_per_user IS NOT NULL AND p_max_entries_per_user <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'حداکثر شرکت در هر کاربر باید بیشتر از صفر باشد');
  END IF;

  IF p_answer_type IS NOT NULL AND p_answer_type NOT IN ('text', 'number') THEN
    RETURN jsonb_build_object('success', false, 'error', 'نوع پاسخ نامعتبر است');
  END IF;

  UPDATE game_rounds SET
    title = COALESCE(p_title, title),
    question = COALESCE(p_question, question),
    challenge_type = COALESCE(p_challenge_type, challenge_type),
    display_image_path = COALESCE(p_display_image_path, display_image_path),
    original_image_path = COALESCE(p_original_image_path, original_image_path),
    answer_type = COALESCE(p_answer_type, answer_type),
    correct_answer = COALESCE(p_correct_answer, correct_answer),
    accepted_answers = COALESCE(p_accepted_answers, accepted_answers),
    entry_fee = COALESCE(p_entry_fee, entry_fee),
    prize_amount = COALESCE(p_prize_amount, prize_amount),
    winner_count = COALESCE(p_winner_count, winner_count),
    max_entries_per_user = COALESCE(p_max_entries_per_user, max_entries_per_user),
    starts_at = COALESCE(p_starts_at, starts_at),
    ends_at = COALESCE(p_ends_at, ends_at)
  WHERE id = p_round_id;

  RETURN jsonb_build_object('success', true, 'round_id', p_round_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION update_game_round FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_game_round FROM anon;
GRANT EXECUTE ON FUNCTION update_game_round TO authenticated;

-- ============================================================
-- 20. Admin RPC: set_game_round_status()
--     State machine transitions:
--       draft → scheduled
--       scheduled → active
--       active → ended
--       ended → drawn
--       draft/scheduled/active → cancelled
-- ============================================================
CREATE OR REPLACE FUNCTION set_game_round_status(
  p_round_id uuid,
  p_new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round game_rounds%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای تغییر وضعیت دور بازی وارد حساب خود شوید');
  END IF;

  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه تغییر وضعیت دور بازی ندارید');
  END IF;

  IF p_new_status NOT IN ('scheduled', 'active', 'ended', 'drawn', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'وضعیت نامعتبر است');
  END IF;

  SELECT * INTO v_round FROM game_rounds WHERE id = p_round_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'دور بازی پیدا نشد');
  END IF;

  IF p_new_status = 'scheduled' AND v_round.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط دورهای پیش‌نویس قابل برنامه‌ریزی هستند');
  END IF;

  IF p_new_status = 'active' AND v_round.status != 'scheduled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط دورهای برنامه‌ریزی‌شده قابل شروع هستند');
  END IF;

  IF p_new_status = 'ended' AND v_round.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط دورهای فعال قابل پایان هستند');
  END IF;

  IF p_new_status = 'drawn' AND v_round.status != 'ended' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط دورهای پایان‌یافته قابل قرعه‌کشی هستند');
  END IF;

  IF p_new_status = 'cancelled' AND v_round.status NOT IN ('draft', 'scheduled', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'این دور قابل لغو نیست');
  END IF;

  UPDATE game_rounds SET status = p_new_status WHERE id = p_round_id;

  RETURN jsonb_build_object('success', true, 'round_id', p_round_id, 'status', p_new_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION set_game_round_status FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_game_round_status FROM anon;
GRANT EXECUTE ON FUNCTION set_game_round_status TO authenticated;

-- ============================================================
-- 21. Seed data: three static game definitions (inactive)
-- ============================================================
INSERT INTO games (slug, name, description, game_type, active, entry_fee, config)
VALUES
  ('guess_it', 'حدس بزن', 'بازی حدس بزن - چالش‌های تصویری و متنی', 'guess_it', false, 0, '{}'::jsonb),
  ('lucky_wheel', 'گردونه شانس', 'گردونه شانس - شانس خود را امتحان کنید', 'lucky_wheel', false, 0, '{}'::jsonb),
  ('gol_ya_poch', 'گل یا پوچ', 'گل یا پوچ - بازی پیش‌بینی', 'gol_ya_poch', false, 0, '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 22. Grant table privileges
-- ============================================================
GRANT SELECT ON games TO anon, authenticated;
GRANT SELECT ON game_entries TO authenticated;
GRANT SELECT ON game_results TO authenticated;
GRANT SELECT ON game_winners TO authenticated;
GRANT SELECT ON game_rounds TO authenticated;
GRANT SELECT ON game_draws TO authenticated;