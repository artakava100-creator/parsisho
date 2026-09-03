/*
# Create profiles table with RLS and auto-creation trigger

## Purpose
Establish the user identity foundation for Parsisho. The `profiles` table stores
application-level user information linked to Supabase Auth's `auth.users` table.

## 1. New Tables

### `profiles`
- `id` (uuid, primary key) — references `auth.users.id`, ON DELETE CASCADE
- `display_name` (text, NOT NULL)
- `avatar_url` (text, nullable)
- `city` (text, nullable)
- `role` (text, NOT NULL, DEFAULT 'user')
- `reputation_score` (integer, NOT NULL, DEFAULT 0)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

## 2. Constraints
- `profiles_role_check` — CHECK ensures role is one of: user, seller, admin, super_admin

## 3. Indexes
- `idx_profiles_role` — for admin queries
- `idx_profiles_created_at` — for sorting/pagination

## 4. Security (RLS)

### Row Level Security: ENABLED

### Policies (4 per CRUD verb, scoped to `authenticated`):
1. SELECT — users read their own profile
2. INSERT — users insert their own profile (trigger also creates via SECURITY DEFINER)
3. UPDATE — users update their own profile (ownership check only)
4. DELETE — users delete their own profile

### Protected Fields (enforced via BEFORE UPDATE trigger):
- `role` — cannot be changed by user (trigger resets to OLD value)
- `reputation_score` — cannot be changed by user (trigger resets to OLD value)
- `id` — primary key, immutable

## 5. Auto-Creation Trigger
- `handle_new_user()` — SECURITY DEFINER, AFTER INSERT on auth.users
- Creates profile row with default role='user', reputation_score=0
- Idempotent via ON CONFLICT DO NOTHING

## 6. Protected Fields Trigger
- `protect_profile_fields()` — BEFORE UPDATE on profiles
- Resets role and reputation_score to OLD values if user attempts to change them
- This is the security boundary: RLS allows the update, but the trigger
  silently prevents protected field changes.
*/

-- ============================================================
-- 1. Create profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  city text,
  role text NOT NULL DEFAULT 'user',
  reputation_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Constraints
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'seller', 'admin', 'super_admin'));
  END IF;
END $$;

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at DESC);

-- ============================================================
-- 4. Enable RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

-- SELECT: users can read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- INSERT: users can insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: users can update their own profile (ownership check only;
-- protected fields are guarded by the BEFORE UPDATE trigger below)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: users can delete their own profile
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- 6. Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================================
-- 7. Protect role and reputation_score from user modification
-- ============================================================
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from changing their own role
  NEW.role = OLD.role;
  -- Prevent users from changing their own reputation_score
  NEW.reputation_score = OLD.reputation_score;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();

-- ============================================================
-- 8. Auto-create profile on user registration
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      'کاربر پارسیشو'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
