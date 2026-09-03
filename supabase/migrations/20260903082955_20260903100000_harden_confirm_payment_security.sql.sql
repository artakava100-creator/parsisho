/*
# P0.6 — Payment Confirmation Security Hardening

## Purpose
Fully harden the payment confirmation flow (create_payment_order /
create_custom_payment_order → gateway → confirm_payment → wallet credit)
so it is safe for production gateway integration. The gateway is NOT
configured yet — no credit is possible without verified payment.

## Vulnerabilities Found & Fixed

1. confirm_payment had no explicit auth.uid() IS NULL defense-in-depth check
   (anon was blocked by GRANT, but the function itself did not guard).
   FIX: Added explicit auth check at the top of confirm_payment.

2. No unique constraint on payment_orders.gateway_reference — the same
   gateway transaction/reference could be replayed to credit a second order.
   FIX: Added a partial unique index on gateway_reference WHERE NOT NULL
   and WHERE status = 'success'. This prevents two successful orders from
   sharing the same gateway reference while allowing NULL references on
   pending orders.

3. No unique constraint on wallet_transactions.payment_order_id — a
   concurrent confirmation could insert two deposit transactions for the
   same order, crediting the wallet twice even if the order status check
   prevented a third.
   FIX: Added a partial unique index on payment_order_id WHERE NOT NULL.
   This makes the wallet_transactions insert the concurrency last-line-of-
   defense: even if two concurrent transactions both pass the status='pending'
   check, only one can insert a row with that payment_order_id; the other
   fails and its transaction rolls back (no wallet credit, no status update).

4. confirm_payment did not pre-check gateway_reference uniqueness before
   crediting — it only wrote the reference after crediting.
   FIX: After the gateway verification section (which currently returns
   gateway_not_configured), the function now checks that the verified
   gateway_reference is not already used by another successful order.
   This is the replay-protection gate. When a real gateway is configured,
   the adapter must supply the verified reference and this check prevents
   reuse.

5. DML privileges (INSERT, UPDATE, DELETE) were still granted to anon and
   authenticated on wallets, wallet_transactions, and payment_orders even
   though RLS policies block them. These are defense-in-depth: if an RLS
   policy is accidentally dropped or weakened, the grants would allow
   direct mutation.
   FIX: Revoked INSERT, UPDATE, DELETE from anon and authenticated on
   wallets, wallet_transactions, payment_orders, and parsi_packages.
   Only SELECT remains (subject to RLS ownership policies).

6. No documented gateway verification integration point or amount check.
   FIX: confirm_payment now has a clearly marked GATEWAY VERIFICATION
   section with a placeholder function call pattern. The section documents
   exactly what the future gateway adapter must return:
     - verified: boolean
     - paid_amount: bigint (must equal order.amount)
     - gateway_reference: text (unique transaction ID)
   The function checks that paid_amount = order.amount before crediting.
   If the amounts differ, it rejects with amount_mismatch and does NOT
   credit. When the gateway is not_configured, it returns
   gateway_not_configured without crediting (unchanged behavior).

## Amount Authority Chain (after this migration)

  Package flow:
    parsi_packages.price  →  payment_orders.amount  (server-set at order creation)
    parsi_packages.parsi_amount + bonus_amount  →  payment_orders.metadata  (server-set)
    confirm_payment reads parsi_amount + bonus_amount from payment_orders.metadata
    confirm_payment verifies gateway paid_amount = payment_orders.amount
    confirm_payment credits parsi_amount + bonus_amount to wallet

  Custom flow:
    p_amount (validated >= 10000 server-side)  →  payment_orders.amount
    p_amount  →  payment_orders.metadata.parsi_amount (bonus = 0)
    confirm_payment reads parsi_amount from metadata
    confirm_payment verifies gateway paid_amount = payment_orders.amount
    confirm_payment credits parsi_amount to wallet

  The client never supplies parsi_amount, bonus_amount, or paid_amount to
  confirm_payment. All are server-derived.

## Payment Verification Chain (after this migration)

  1. auth.uid() IS NOT NULL  (defense-in-depth)
  2. SELECT ... FOR UPDATE on payment_orders  (row lock)
  3. ownership: v_order.user_id = auth.uid()
  4. status = 'pending'  (not success/failed/cancelled)
  5. gateway IS NOT NULL AND gateway != 'not_configured'
  6. GATEWAY VERIFICATION: call adapter → { verified, paid_amount, gateway_reference }
     (currently returns gateway_not_configured — no credit)
  7. paid_amount = order.amount  (amount match)
  8. gateway_reference not already used by another successful order  (replay guard)
  9. SELECT FOR UPDATE on wallets  (wallet row lock)
  10. credit wallet + insert wallet_transactions(payment_order_id)  (atomic)
  11. update payment_orders status = 'success'  (atomic, same transaction)
  12. unique index on wallet_transactions.payment_order_id  (concurrency last line)

## Replay Protection
  - Already-paid order returns already_confirmed (no second credit).
  - gateway_reference partial unique index prevents reuse across orders.
  - wallet_transactions.payment_order_id partial unique index prevents
    duplicate deposit rows for the same order.

## Concurrency Protection
  - SELECT FOR UPDATE on payment_orders serializes confirmations.
  - If two transactions somehow both read 'pending' before the lock
    serializes them, the unique index on wallet_transactions.payment_order_id
    causes the second insert to fail, rolling back its entire transaction
    (no wallet credit, no status change).

## Gateway Reference Protection
  - Partial unique index: payment_orders_gateway_reference_unique
    ON (gateway_reference) WHERE gateway_reference IS NOT NULL AND status = 'success'
  - Pre-credit check in confirm_payment: rejects if the verified reference
    already exists on another successful order.

## RPC Privileges After Changes
  - purchase_parsi_package:   authenticated = NO, anon = NO  (unchanged)
  - deposit_wallet:            authenticated = NO, anon = NO  (unchanged)
  - create_payment_order:      authenticated = YES, anon = NO  (unchanged)
  - create_custom_payment_order: authenticated = YES, anon = NO  (unchanged)
  - confirm_payment:           authenticated = YES, anon = NO  (unchanged)
  - cancel_payment_order:      authenticated = YES, anon = NO  (unchanged)

## RLS / Security Definer Findings
  - All financial RPCs are SECURITY DEFINER with SET search_path = public.  (OK)
  - RLS enabled on all financial tables.  (OK)
  - Only SELECT policies exist on financial tables (owner-scoped).  (OK)
  - No INSERT/UPDATE/DELETE policies — all mutations via RPCs.  (OK)
  - DML grants revoked from client roles as defense-in-depth.  (NEW)

## Important Notes
1. No real gateway is configured. confirm_payment returns
   gateway_not_configured and does NOT credit. This is the correct
   behavior for the current state.
2. The GATEWAY VERIFICATION section is the exact integration point that
   the future gateway adapter must call. It must return:
     - verified (boolean): whether the payment was genuinely verified
     - paid_amount (bigint): the exact amount the gateway confirms was paid
     - gateway_reference (text): the gateway's unique transaction/reference ID
3. The amount check (paid_amount = order.amount) is already implemented
   but only reached when a real gateway is configured. Until then, the
   gateway_not_configured gate prevents any credit.
4. Custom amount top-up (create_custom_payment_order) is preserved.
5. Package purchase flow (create_payment_order → confirm_payment) is preserved.
6. deposit_wallet remains locked (no execute grants to any client role).
7. purchase_parsi_package remains locked (no execute grants to any client role).
*/

-- ============================================================
-- 1. Revoke DML privileges from client roles on financial tables
--    Defense-in-depth: RLS already blocks these, but if a policy is
--    ever weakened, these grants would allow direct mutation.
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON wallet_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON payment_orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON parsi_packages FROM anon, authenticated;

-- ============================================================
-- 2. Unique index on gateway_reference for successful orders
--    Prevents the same gateway transaction/reference from being
--    attached to two different successful payment orders.
--    Partial: only applies when gateway_reference IS NOT NULL and
--    status = 'success', so pending orders with NULL references
--    don't conflict.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_gateway_reference_unique
  ON payment_orders (gateway_reference)
  WHERE gateway_reference IS NOT NULL AND status = 'success';

-- ============================================================
-- 3. Unique index on wallet_transactions.payment_order_id
--    Last-line-of-defense against concurrent double-credit.
--    If two concurrent confirmations both pass the status='pending'
--    check, only one can insert a wallet_transactions row with
--    that payment_order_id. The second insert fails with a unique
--    violation, causing its entire transaction to roll back.
--    Partial: only applies when payment_order_id IS NOT NULL,
--    so non-payment transactions (auction bids, rewards, etc.)
--    with NULL payment_order_id don't conflict.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_payment_order_id_unique
  ON wallet_transactions (payment_order_id)
  WHERE payment_order_id IS NOT NULL;

-- ============================================================
-- 4. Recreate confirm_payment with full security hardening
--    Preserves signature: (p_payment_order_id uuid, p_gateway_reference text, p_gateway_authority text)
--    Preserves GRANT: authenticated only
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
  v_verified boolean;
  v_paid_amount bigint;
  v_gateway_ref text;
  v_ref_count int;
BEGIN
  -- Defense-in-depth: explicit auth check
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای تأیید پرداخت وارد حساب خود شوید');
  END IF;

  -- Lock the order row
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

  -- Idempotency: already-paid order returns success without re-crediting
  IF v_order.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'already_confirmed', true, 'message', 'این پرداخت قبلاً تأیید شده است');
  END IF;

  -- Status protection: only pending orders may proceed
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

  -- ==========================================================
  -- GATEWAY VERIFICATION (future integration point)
  -- ==========================================================
  -- When a real gateway is configured, this is where the server
  -- calls the gateway's verify API. The adapter MUST return:
  --   verified  (boolean)  — whether the payment was genuinely verified
  --   paid_amount (bigint)  — the exact amount the gateway confirms was paid
  --   gateway_reference (text) — the gateway's unique transaction/reference ID
  --
  -- Example future call:
  --   SELECT * FROM verify_gateway_payment(v_order.id, v_order.amount, COALESCE(v_order.authority, p_gateway_authority))
  --   INTO v_verified, v_paid_amount, v_gateway_ref;
  --
  -- Until a real gateway adapter is deployed, this section is
  -- unreachable because the gateway_not_configured gate above
  -- returns early. No fake/mock verification logic is implemented.
  -- ==========================================================

  -- Placeholder: in production, v_verified, v_paid_amount, v_gateway_ref
  -- come from the gateway adapter. For now they are unset and the
  -- gateway_not_configured gate prevents reaching here.
  v_verified := false;
  v_paid_amount := 0;
  v_gateway_ref := COALESCE(p_gateway_reference, v_order.gateway_reference);

  -- If gateway verification failed, reject without crediting
  IF NOT v_verified THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'تأیید پرداخت توسط درگاه ناموفق بود',
      'code', 'gateway_verification_failed'
    );
  END IF;

  -- Amount verification: gateway paid amount MUST equal order amount
  IF v_paid_amount != v_order.amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'مبلغ پرداختی با مبلغ سفارش مطابقت ندارد',
      'code', 'amount_mismatch',
      'order_amount', v_order.amount,
      'paid_amount', v_paid_amount
    );
  END IF;

  -- Gateway reference replay protection: the same reference must not
  -- already be attached to another successful order.
  IF v_gateway_ref IS NOT NULL THEN
    SELECT count(*) INTO v_ref_count
    FROM payment_orders
    WHERE gateway_reference = v_gateway_ref
      AND status = 'success'
      AND id != v_order.id;

    IF v_ref_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'این مرجع پرداخت قبلاً استفاده شده است',
        'code', 'gateway_reference_replay'
      );
    END IF;
  END IF;

  -- Derive credit amount from server-controlled metadata (never client)
  v_pkg_meta := v_order.metadata;
  v_credit_amount := (v_pkg_meta->>'parsi_amount')::bigint + COALESCE((v_pkg_meta->>'bonus_amount')::bigint, 0);

  -- Lock wallet row
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id) VALUES (v_order.user_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_order.user_id FOR UPDATE;
  END IF;

  v_new_balance := v_wallet.available_balance + v_credit_amount;

  -- Credit wallet
  UPDATE wallets SET available_balance = v_new_balance WHERE user_id = v_order.user_id;

  -- Build description
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

  -- Record transaction (unique index on payment_order_id prevents duplicates)
  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, status, payment_order_id)
  VALUES (v_order.user_id, 'deposit', v_credit_amount, v_new_balance, v_description, 'completed', v_order.id);

  -- Mark order as paid (atomic with wallet credit in same transaction)
  UPDATE payment_orders
  SET status = 'success',
      gateway_reference = COALESCE(v_gateway_ref, gateway_reference),
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