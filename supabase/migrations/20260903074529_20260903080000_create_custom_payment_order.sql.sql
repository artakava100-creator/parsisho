/*
# Create Custom Payment Order RPC

## Purpose
Allow users to create a payment order for a custom (non-package) amount,
enabling "شارژ مبلغ دلخواه" (custom top-up) via the secure payment flow.
The existing `create_payment_order` only accepts package IDs and derives
the amount from the package. This new RPC accepts a user-specified amount
but still does NOT credit the wallet — it only creates a pending order.
Wallet crediting happens exclusively through `confirm_payment` after
gateway verification.

## New RPC
- `create_custom_payment_order(p_amount bigint, p_idempotency_key uuid)`
  - Validates: authenticated user, amount > 0, integer
  - Idempotent: same idempotency_key returns existing order
  - Creates payment_order with package_id = NULL, amount = p_amount
  - Stores metadata: {"parsi_amount": p_amount, "bonus_amount": 0}
  - gateway = 'not_configured' (same as package-based orders)

## Security
- SECURITY DEFINER, SET search_path = public
- REVOKE from PUBLIC, anon; GRANT to authenticated only
- No changes to existing RPCs, tables, RLS, or constraints
- deposit_wallet remains locked (EXECUTE revoked from authenticated+anon)
*/

CREATE OR REPLACE FUNCTION create_custom_payment_order(
  p_amount bigint,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing payment_orders%ROWTYPE;
  v_order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای ایجاد سفارش پرداخت وارد حساب خود شوید');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ باید یک عدد مثبت باشد');
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

  INSERT INTO payment_orders (user_id, package_id, amount, currency, status, gateway, idempotency_key, metadata)
  VALUES (auth.uid(), NULL, p_amount, 'پارسی', 'pending', 'not_configured', p_idempotency_key,
    jsonb_build_object('parsi_amount', p_amount, 'bonus_amount', 0))
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

REVOKE EXECUTE ON FUNCTION create_custom_payment_order(bigint, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_custom_payment_order(bigint, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION create_custom_payment_order(bigint, uuid) TO authenticated;