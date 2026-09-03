/*
# Server-Side Custom Top-Up Minimum (FIN-006)

## Purpose
Enforce a minimum of 10,000 پارسی for custom top-up amounts at the
server side so the minimum cannot be bypassed by calling the RPC directly.

## Scope
- create_custom_payment_order RPC only
- No changes to confirm_payment, create_payment_order, purchase_parsi_package,
  deposit_wallet, wallet tables, RLS, gateway, or metadata

## Security
- The minimum check replaces the previous positive-amount check (p_amount <= 0)
  with p_amount < 10000, which also covers the positive-amount case.
- All existing protections preserved: auth check, idempotency, ownership,
  metadata structure, gateway config, return structure.
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

  IF p_amount IS NULL OR p_amount < 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'حداقل مبلغ شارژ ۱۰٬۰۰۰ پارسی است');
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
