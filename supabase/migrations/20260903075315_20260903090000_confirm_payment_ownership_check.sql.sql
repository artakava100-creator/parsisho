/*
# confirm_payment Ownership Hardening (SEC-011)

## Purpose
Prevent an authenticated user from confirming another user's payment order.
Add server-side ownership check: payment_orders.user_id = auth.uid()

## Scope
- confirm_payment RPC only
- No changes to create_payment_order, create_custom_payment_order, deposit_wallet,
  wallet tables, wallet RLS, payment_orders RLS, gateway logic, or metadata

## Security
- Ownership check executes AFTER order load + NOT FOUND, BEFORE any status/gateway/wallet logic
- Unauthorized caller gets controlled failure, no gateway verification, no wallet credit
- Error message matches existing convention from cancel_payment_order
*/

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

  -- Ownership check: only the order owner can confirm
  IF v_order.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'این سفارش متعلق به شما نیست');
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
