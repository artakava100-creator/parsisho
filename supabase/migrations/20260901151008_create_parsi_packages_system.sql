/*
# Create Parsi Packages System

## Purpose
Build a configurable package system for wallet charging. Users purchase
Parsi packages to credit their wallet. Each package has a Parsi amount, a
price (in toman, 1:1 with Parsi), an optional bonus amount, active flag,
and sort order. Admins can create/edit/deactivate packages via RPCs.

## Data Model

### parsi_packages
- `id` (uuid, PK)
- `parsi_amount` (bigint, NOT NULL) — Parsi units the user receives
- `price` (bigint, NOT NULL) — price in toman (1:1 with Parsi for now)
- `bonus_amount` (bigint, NOT NULL, DEFAULT 0) — extra Parsi credited as bonus
- `is_active` (boolean, NOT NULL, DEFAULT true)
- `sort_order` (integer, NOT NULL, DEFAULT 0)
- `label` (text, nullable) — optional display label
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

## RPCs

### purchase_parsi_package(p_package_id uuid)
SECURITY DEFINER. Validates the package exists and is active, reads amount
and bonus from the database (never trusts client), atomically credits the
caller's wallet (available_balance + parsi_amount + bonus_amount), and
records a 'deposit' transaction. Returns the updated wallet.

### Admin RPCs (all check is_admin())
- admin_create_parsi_package(p_parsi_amount, p_price, p_bonus_amount, p_label, p_sort_order)
- admin_update_parsi_package(p_package_id, p_parsi_amount, p_price, p_bonus_amount, p_label, p_sort_order, p_is_active)
- admin_list_parsi_packages() — returns all packages including inactive

## Security (RLS)
- parsi_packages: public read for active packages (anon + authenticated SELECT
  WHERE is_active = true). No INSERT/UPDATE/DELETE — all mutations via RPCs.
- All RPCs are SECURITY DEFINER with SET search_path = public.
- purchase_parsi_package reads package data server-side, never trusts client.
- Admin RPCs verify is_admin() before any mutation.

## Money Representation
All amounts are bigint (integer). parsi_amount and bonus_amount are in Parsi
units. price is in toman. No floating-point.

## Important Notes
1. The purchase flow is TEST/DEMO — it credits directly without a payment gateway.
   When a real gateway is added, the gateway callback will call this RPC (or a
   successor) after verifying payment.
2. The transaction type is 'deposit' with a description noting the package.
3. Package amount + bonus are read from the DB inside the RPC — client cannot
   manipulate the credited amount.
4. Inactive packages cannot be purchased.
*/

-- ============================================================
-- 1. Create parsi_packages table
-- ============================================================
CREATE TABLE IF NOT EXISTS parsi_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parsi_amount bigint NOT NULL CHECK (parsi_amount > 0),
  price bigint NOT NULL CHECK (price > 0),
  bonus_amount bigint NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_parsi_packages_active_sort
  ON parsi_packages (is_active, sort_order);

-- ============================================================
-- 3. Enable RLS
-- ============================================================
ALTER TABLE parsi_packages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies — public read for active packages only
-- ============================================================
DROP POLICY IF EXISTS "public_read_active_parsi_packages" ON parsi_packages;
CREATE POLICY "public_read_active_parsi_packages"
  ON parsi_packages FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- No INSERT/UPDATE/DELETE policies — all mutations via SECURITY DEFINER RPCs

-- ============================================================
-- 5. Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_parsi_packages_updated_at()
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

DROP TRIGGER IF EXISTS trg_parsi_packages_updated_at ON parsi_packages;
CREATE TRIGGER trg_parsi_packages_updated_at
  BEFORE UPDATE ON parsi_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_parsi_packages_updated_at();

REVOKE EXECUTE ON FUNCTION update_parsi_packages_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_parsi_packages_updated_at() FROM anon, authenticated;

-- ============================================================
-- 6. purchase_parsi_package(p_package_id uuid) RPC
--    TEST/DEMO: credits wallet directly without payment gateway.
--    Reads package amount + bonus from DB — never trusts client.
-- ============================================================
CREATE OR REPLACE FUNCTION purchase_parsi_package(p_package_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package parsi_packages%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_credit_amount bigint;
  v_new_balance bigint;
  v_description text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای خرید پکیج وارد حساب خود شوید');
  END IF;

  -- Read package from DB (never trust client)
  SELECT * INTO v_package
  FROM parsi_packages
  WHERE id = p_package_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'پکیج مورد نظر پیدا نشد');
  END IF;

  IF NOT v_package.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'این پکیج در حال حاضر قابل خرید نیست');
  END IF;

  -- Total credit = parsi_amount + bonus_amount
  v_credit_amount := v_package.parsi_amount + v_package.bonus_amount;

  -- Lock wallet row
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id)
    VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_wallet
    FROM wallets
    WHERE user_id = auth.uid()
    FOR UPDATE;
  END IF;

  v_new_balance := v_wallet.available_balance + v_credit_amount;

  UPDATE wallets
  SET available_balance = v_new_balance
  WHERE user_id = auth.uid();

  -- Build description
  v_description := 'خرید پکیج ' || v_package.parsi_amount::text || ' پارسی';
  IF v_package.bonus_amount > 0 THEN
    v_description := v_description || ' (بونوس ' || v_package.bonus_amount::text || ' پارسی)';
  END IF;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (auth.uid(), 'deposit', v_credit_amount, v_new_balance, v_description);

  RETURN jsonb_build_object(
    'success', true,
    'wallet', jsonb_build_object(
      'user_id', v_wallet.user_id,
      'available_balance', v_new_balance,
      'locked_balance', v_wallet.locked_balance,
      'created_at', v_wallet.created_at,
      'updated_at', now()
    ),
    'credited_amount', v_credit_amount
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION purchase_parsi_package(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION purchase_parsi_package(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION purchase_parsi_package(uuid) TO authenticated;

-- ============================================================
-- 7. Admin RPC: admin_create_parsi_package
-- ============================================================
CREATE OR REPLACE FUNCTION admin_create_parsi_package(
  p_parsi_amount bigint,
  p_price bigint,
  p_bonus_amount bigint DEFAULT 0,
  p_label text DEFAULT NULL,
  p_sort_order integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ایجاد پکیج ندارید');
  END IF;

  IF p_parsi_amount IS NULL OR p_parsi_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مقدار پارسی نامعتبر است');
  END IF;

  IF p_price IS NULL OR p_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'قیمت نامعتبر است');
  END IF;

  IF p_bonus_amount IS NULL OR p_bonus_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'بونوس نامعتبر است');
  END IF;

  INSERT INTO parsi_packages (parsi_amount, price, bonus_amount, label, sort_order)
  VALUES (p_parsi_amount, p_price, p_bonus_amount, p_label, p_sort_order)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'package_id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_create_parsi_package(bigint, bigint, bigint, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_create_parsi_package(bigint, bigint, bigint, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION admin_create_parsi_package(bigint, bigint, bigint, text, integer) TO authenticated;

-- ============================================================
-- 8. Admin RPC: admin_update_parsi_package
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_parsi_package(
  p_package_id uuid,
  p_parsi_amount bigint DEFAULT NULL,
  p_price bigint DEFAULT NULL,
  p_bonus_amount bigint DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg parsi_packages%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه ویرایش پکیج ندارید');
  END IF;

  SELECT * INTO v_pkg FROM parsi_packages WHERE id = p_package_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'پکیج پیدا نشد');
  END IF;

  IF p_parsi_amount IS NOT NULL AND p_parsi_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مقدار پارسی نامعتبر است');
  END IF;
  IF p_price IS NOT NULL AND p_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'قیمت نامعتبر است');
  END IF;
  IF p_bonus_amount IS NOT NULL AND p_bonus_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'بونوس نامعتبر است');
  END IF;

  UPDATE parsi_packages SET
    parsi_amount = COALESCE(p_parsi_amount, parsi_amount),
    price = COALESCE(p_price, price),
    bonus_amount = COALESCE(p_bonus_amount, bonus_amount),
    label = COALESCE(p_label, label),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_package_id;

  RETURN jsonb_build_object('success', true, 'package_id', p_package_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_parsi_package(uuid, bigint, bigint, bigint, text, integer, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_update_parsi_package(uuid, bigint, bigint, bigint, text, integer, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION admin_update_parsi_package(uuid, bigint, bigint, bigint, text, integer, boolean) TO authenticated;

-- ============================================================
-- 9. Admin RPC: admin_list_parsi_packages
--    Returns all packages including inactive (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_parsi_packages()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_packages jsonb;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه مشاهده پکیج‌ها را ندارید');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'parsi_amount', p.parsi_amount,
      'price', p.price,
      'bonus_amount', p.bonus_amount,
      'is_active', p.is_active,
      'sort_order', p.sort_order,
      'label', p.label,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    )
    ORDER BY p.sort_order ASC, p.parsi_amount ASC
  ), '[]'::jsonb) INTO v_packages
  FROM parsi_packages p;

  RETURN jsonb_build_object('success', true, 'packages', v_packages);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_parsi_packages() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_list_parsi_packages() FROM anon;
GRANT EXECUTE ON FUNCTION admin_list_parsi_packages() TO authenticated;

-- ============================================================
-- 10. Seed default packages
-- ============================================================
INSERT INTO parsi_packages (parsi_amount, price, bonus_amount, sort_order, label)
VALUES
  (100000, 100000, 0, 1, 'پکیج پایه'),
  (250000, 250000, 10000, 2, 'پکیج نقره'),
  (500000, 500000, 30000, 3, 'پکیج طلایی'),
  (1000000, 1000000, 80000, 4, 'پکیج ویژه')
ON CONFLICT DO NOTHING;
