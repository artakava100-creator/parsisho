/*
# Add phone number fields to profiles table

## Purpose
Establish the mobile-number identity foundation for Parsisho. This migration adds
two columns to the `profiles` table:
- `phone_number` (text, nullable) — the user's phone number
- `phone_verified_at` (timestamptz, nullable) — timestamp when the phone was verified

## Security Model

### phone_number
- User-editable: users can set/update their own phone number
- Protected by RLS: users can only update their own row (auth.uid() = id)

### phone_verified_at
- NOT user-editable: this is a privileged verification field
- Protected by the `protect_profile_fields` trigger: the trigger resets
  phone_verified_at to OLD value on every UPDATE, so a user cannot
  self-verify their phone by submitting phone_verified_at = now()
- Only a trusted backend process (e.g., edge function with service role,
  or a SECURITY DEFINER function called by the auth system) can set this

## Changes
1. Add `phone_number` column (text, nullable)
2. Add `phone_verified_at` column (timestamptz, nullable)
3. Update `protect_profile_fields()` trigger to also protect `phone_verified_at`

## Important Notes
1. The trigger function `protect_profile_fields()` is recreated to include
   `phone_verified_at` in the list of protected fields.
2. Users CAN set their `phone_number` but CANNOT set `phone_verified_at`.
3. The UI should show "شماره موبایل ثبت نشده" when phone_number is null,
   and "تأیید نشده" when phone_verified_at is null but phone_number exists.
*/

-- ============================================================
-- 1. Add phone_number column
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;
END $$;

-- ============================================================
-- 2. Add phone_verified_at column
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified_at timestamptz;
  END IF;
END $$;

-- ============================================================
-- 3. Update protect_profile_fields trigger to also protect phone_verified_at
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
  RETURN NEW;
END;
$$;
