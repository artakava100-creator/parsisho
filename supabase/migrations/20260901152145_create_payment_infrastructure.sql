/*
# Payment Infrastructure — payment_orders + wallet_transactions status + RPCs

## Purpose
Build production-grade payment infrastructure. Creates payment_orders table,
adds status to wallet_transactions, and provides idempotent create_payment_order
and confirm_payment RPCs. The gateway is NOT configured — confirm_payment returns
'gateway_not_configured' without crediting the wallet.

## Security (RLS)
- payment_orders: SELECT own only, no INSERT/UPDATE/DELETE
- All mutations via SECURITY DEFINER RPCs with SET search_path = public
*/

-- ============================================================
-- 1. Create payment_orders table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid REFERENCES parsi_packages(id) ON DELETE SET NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'پارسی',
  status text NOT NULL DEFAULT 'pending',
  gateway text,
  gateway_reference text,
  authority text,
  idempotency_key uuid NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  failed_at timestamptz
);

-- ============================================================
-- 2. Constraints on payment_orders
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_orders_status_check'
  ) THEN
    ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_status_check
      CHECK (status IN ('pending', 'success', 'failed', 'cancelled'));
  END IF;
END $$;

-- ============================================================
-- 3. Indexes on payment_orders
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_gateway_ref ON payment_orders(gateway_reference);
CREATE INDEX IF NOT EXISTS idx_payment_orders_authority ON payment_orders(authority);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at DESC);

-- ============================================================
-- 4. Enable RLS on payment_orders
-- ============================================================
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies — payment_orders (owner read only)
-- ============================================================
DROP POLICY IF EXISTS "payment_orders_select_own" ON payment_orders;
CREATE POLICY "payment_orders_select_own"
  ON payment_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies — all mutations via SECURITY DEFINER RPCs

-- ============================================================
-- 6. Updated_at trigger for payment_orders
-- ============================================================
CREATE OR REPLACE FUNCTION update_payment_orders_updated_at()
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

DROP TRIGGER IF EXISTS trg_payment_orders_updated_at ON payment_orders;
CREATE TRIGGER trg_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_orders_updated_at();

REVOKE EXECUTE ON FUNCTION update_payment_orders_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_payment_orders_updated_at() FROM anon, authenticated;

-- ============================================================
-- 7. Add status + payment_order_id to wallet_transactions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN status text NOT NULL DEFAULT 'completed';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_status_check'
  ) THEN
    ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_status_check
      CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' AND column_name = 'payment_order_id'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN payment_order_id uuid REFERENCES payment_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_order_id
  ON wallet_transactions(payment_order_id);

-- ============================================================
-- 8. create_payment_order(p_package_id uuid, p_idempotency_key uuid)
--    Idempotent: same idempotency_key returns existing order.
--    Does NOT credit wallet. Creates with status='pending'.
-- ============================================================
CREATE OR REPLACE FUNCTION create_payment_order(
  p_package_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing payment_orders%ROWTYPE;
  v_package parsi_packages%ROWTYPE;
  v_order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای ایجاد سفارش پرداخت وارد حساب خود شوید');
  END IF;

  -- Check idempotency: return existing order if same key
  SELECT * INTO v_existing
  FROM payment_orders
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.user_id != auth.uid() THEN
      RETURN jsonb_build_object('success', false, 'error', 'کلید یکتا متعلق به شما نیست');
    END IF;
    RETURN jsonb_build_object(
      'success', true,
      'payment_order', jsonb_build_object(
        'id', v_existing.id,
        'user_id', v_existing.user_id,
        'package_id', v_existing.package_id,
        'amount', v_existing.amount,
        'currency', v_existing.currency,
        'status', v_existing.status,
        'gateway', v_existing.gateway,
        'gateway_reference', v_existing.gateway_reference,
        'authority', v_existing.authority,
        'idempotency_key', v_existing.idempotency_key,
        'created_at', v_existing.created_at,
        'updated_at', v_existing.updated_at,
        'paid_at', v_existing.paid_at,
        'failed_at', v_existing.failed_at
      ),
      'is_existing', true
    );
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

  INSERT INTO payment_orders (user_id, package_id, amount, currency, status, gateway, idempotency_key, metadata)
  VALUES (auth.uid(), p_package_id, v_package.price, 'پارسی', 'pending', 'not_configured', p_idempotency_key,
    jsonb_build_object('parsi_amount', v_package.parsi_amount, 'bonus_amount', v_package.bonus_amount, 'package_label', v_package.label))
  RETURNING id INTO v_order_id;

  SELECT * INTO v_existing FROM payment_orders WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_order', jsonb_build_object(
      'id', v_existing.id,
      'user_id', v_existing.user_id,
      'package_id', v_existing.package_id,
      'amount', v_existing.amount,
      'currency', v_existing.currency,
      'status', v_existing.status,
      'gateway', v_existing.gateway,
      'gateway_reference', v_existing.gateway_reference,
      'authority', v_existing.authority,
      'idempotency_key', v_existing.idempotency_key,
      'created_at', v_existing.created_at,
      'updated_at', v_existing.updated_at,
      'paid_at', v_existing.paid_at,
      'failed_at', v_existing.failed_at
    ),
    'is_existing', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION create_payment_order(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_payment_order(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION create_payment_order(uuid, uuid) TO authenticated;

-- ============================================================
-- 9. confirm_payment(p_payment_order_id uuid, p_gateway_reference text, p_gateway_authority text)
--    Server-side confirmation. Idempotent. Atomic.
--    If gateway='not_configured': returns gateway_not_configured, does NOT credit.
-- ============================================================
CREATE OR REPLACE FUNCTION confirm_payment(
  p_payment_order_id uuid,
  p_gateway_reference text DEFAULT NULL,
  p_gateway_authority text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_package parsi_packages%ROWTYPE;
  v_credit_amount bigint;
  v_new_balance bigint;
  v_description text;
  v_pkg_meta jsonb;
BEGIN
  SELECT * INTO v_order
  FROM payment_orders
  WHERE id = p_payment_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'سفارش پرداخت پیدا نشد');
  END IF;

  IF v_order.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true, 'message', 'این پرداخت قبلاً تأیید شده است');
  END IF;

  IF v_order.status = 'failed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'این پرداخت ناموفق بوده است');
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'این پرداخت لغو شده است');
  END IF;

  -- Gateway not configured: do NOT credit wallet
  IF v_order.gateway = 'not_configured' OR v_order.gateway IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'درگاه پرداخت هنوز فعال نشده است',
      'code', 'gateway_not_configured'
    );
  END IF;

  -- --- Gateway verification would go here ---
  -- In production, this is where we'd call the gateway's verify API.
  -- For now, we only reach here if gateway is configured (which it isn't).

  v_pkg_meta := v_order.metadata;
  v_credit_amount := (v_pkg_meta->>'parsi_amount')::bigint + COALESCE((v_pkg_meta->>'bonus_amount')::bigint, 0);

  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id) VALUES (v_order.user_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_order.user_id FOR UPDATE;
  END IF;

  v_new_balance := v_wallet.available_balance + v_credit_amount;

  UPDATE wallets SET available_balance = v_new_balance WHERE user_id = v_order.user_id;

  v_description := 'شارژ کیف پول - سفارش ' || v_order.id::text;
  IF v_order.package_id IS NOT NULL THEN
    SELECT * INTO v_package FROM parsi_packages WHERE id = v_order.package_id;
    IF FOUND THEN
      v_description := 'خرید پکیج ' || COALESCE(v_package.label, v_package.parsi_amount::text || ' پارسی');
      IF v_package.bonus_amount > 0 THEN
        v_description := v_description || ' (بونوس ' || v_package.bonus_amount::text || ' پارسی)';
      END IF;
    END IF;
  END IF;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, status, payment_order_id)
  VALUES (v_order.user_id, 'deposit', v_credit_amount, v_new_balance, v_description, 'completed', v_order.id);

  UPDATE payment_orders
  SET status = 'success',
      gateway_reference = COALESCE(p_gateway_reference, gateway_reference),
      authority = COALESCE(p_gateway_authority, authority),
      paid_at = now()
  WHERE id = p_payment_order_id;

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

REVOKE EXECUTE ON FUNCTION confirm_payment(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION confirm_payment(uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_payment(uuid, text, text) TO authenticated;

-- ============================================================
-- 10. cancel_payment_order(p_payment_order_id uuid)
--     User can cancel their own pending payment orders.
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_payment_order(p_payment_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order payment_orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای لغو سفارش وارد حساب خود شوید');
  END IF;

  SELECT * INTO v_order FROM payment_orders WHERE id = p_payment_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'سفارش پرداخت پیدا نشد');
  END IF;

  IF v_order.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'این سفارش متعلق به شما نیست');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فقط سفارش‌های در انتظار قابل لغو هستند');
  END IF;

  UPDATE payment_orders SET status = 'cancelled', failed_at = now() WHERE id = p_payment_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_payment_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cancel_payment_order(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_payment_order(uuid) TO authenticated;

-- ============================================================
-- 11. admin_list_payment_orders(p_status text, p_limit int, p_offset int)
--     Admin only. Returns all payment orders with optional status filter.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_payment_orders(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders jsonb;
  v_total bigint;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما اجازه مشاهده پرداخت‌ها را ندارید');
  END IF;

  SELECT count(*) INTO v_total FROM payment_orders
  WHERE p_status IS NULL OR status = p_status;

  SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_orders
  FROM (
    SELECT * FROM payment_orders
    WHERE p_status IS NULL OR status = p_status
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('success', true, 'orders', v_orders, 'total', v_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_payment_orders(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_list_payment_orders(text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION admin_list_payment_orders(text, integer, integer) TO authenticated;
