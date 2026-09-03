/*
# Add account_status, identity_verified_at to profiles + phone verification invalidation

## Purpose
Complete the identity foundation for Parsisho by adding:
1. `account_status` — controlled account state (active/restricted/suspended/disabled)
2. `identity_verified_at` — timestamp for future KYC/identity verification
3. Phone verification invalidation — when a user changes their phone_number,
   any existing `phone_verified_at` must be cleared (reset to NULL) since the
   new number has not been verified.

## Security Model

### account_status
- NOT user-editable: protected by the `protect_profile_fields` trigger
- Only a trusted backend process (admin edge function, SECURITY DEFINER function)
  can change this value
- Default: 'active'

### identity_verified_at
- NOT user-editable: protected by the `protect_profile_fields` trigger
- Only a trusted backend process can set this
- Default: NULL (not verified)

### Phone verification invalidation
- When a user updates `phone_number` to a DIFFERENT value than the old one,
  the trigger clears `phone_verified_at` to NULL
- This prevents a user from changing their phone number while keeping
  a verification timestamp from a completely different number
- The trigger runs BEFORE UPDATE, so it can compare NEW vs OLD

## Changes
1. Add `account_status` column (text, NOT NULL, DEFAULT 'active')
2. Add `identity_verified_at` column (timestamptz, nullable)
3. Add CHECK constraint on account_status
4. Update `protect_profile_fields()` trigger to:
   - Protect `account_status` (reset to OLD value)
   - Protect `identity_verified_at` (reset to OLD value)
   - Invalidate `phone_verified_at` when `phone_number` changes
5. Add index on account_status for admin queries

## Important Notes
1. The trigger now has conditional logic: if NEW.phone_number IS DISTINCT FROM OLD.phone_number,
   then NEW.phone_verified_at = NULL (the new number is unverified)
2. All other protected fields (role, reputation_score, account_status, identity_verified_at)
   are unconditionally reset to OLD values
3. Users CAN update: display_name, avatar_url, city, phone_number
4. Users CANNOT update: role, reputation_score, phone_verified_at, account_status, identity_verified_at
*/

-- ============================================================
-- 1. Add account_status column
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- ============================================================
-- 2. Add identity_verified_at column
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'identity_verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN identity_verified_at timestamptz;
  END IF;
END $$;

-- ============================================================
-- 3. Add CHECK constraint on account_status
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('active', 'restricted', 'suspended', 'disabled'));
  END IF;
END $$;

-- ============================================================
-- 4. Update protect_profile_fields trigger
--    Now protects: role, reputation_score, phone_verified_at,
--    account_status, identity_verified_at
--    AND invalidates phone_verified_at when phone_number changes
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
  -- Prevent users from self-verifying their phone number
  NEW.phone_verified_at = OLD.phone_verified_at;
  -- Prevent users from changing their own account status
  NEW.account_status = OLD.account_status;
  -- Prevent users from self-verifying their identity
  NEW.identity_verified_at = OLD.identity_verified_at;

  -- If the phone number is changing, invalidate any previous verification
  -- The new number must go through the verification process again
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    NEW.phone_verified_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Add index on account_status for admin queries
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_account_status'
  ) THEN
    CREATE INDEX idx_profiles_account_status ON profiles(account_status);
  END IF;
END $$;
