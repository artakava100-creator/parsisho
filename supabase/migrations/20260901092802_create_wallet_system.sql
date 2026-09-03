/*
# Create wallet system for Parsisho marketplace

## Purpose
Build the wallet infrastructure for the Parsisho marketplace. Users need a wallet
to hold their balance (in toman), and a transaction ledger that records every
financial movement: deposits, withdrawals, auction bid locks, auction refunds,
direct purchases, rewards, and admin adjustments.

## Data Model

### wallets
- `user_id` (uuid, PK, REFERENCES auth.users, ON DELETE CASCADE)
- `available_balance` (bigint, NOT NULL, DEFAULT 0) — spendable balance in toman
- `locked_balance` (bigint, NOT NULL, DEFAULT 0) — balance locked in active auctions
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

One wallet per user. The PK on user_id enforces 1:1.

### wallet_transactions
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, REFERENCES auth.users, ON DELETE CASCADE)
- `type` (text, NOT NULL) — deposit|withdrawal|auction_bid|auction_refund|direct_purchase|reward|daily_reward|referral_reward|admin_adjustment
- `amount` (bigint, NOT NULL) — positive = credit, negative = debit, in toman
- `balance_after` (bigint, NOT NULL) — available_balance after the transaction
- `description` (text, NOT NULL, DEFAULT '')
- `created_at` (timestamptz, NOT NULL, DEFAULT now())

Append-only ledger. No UPDATE or DELETE — transactions are immutable once recorded.

## RPCs

### get_or_create_wallet()
SECURITY DEFINER. Returns the caller's wallet row, creating it if it does not
exist. Prevents race conditions with INSERT ... ON CONFLICT.

### deposit_wallet(p_amount bigint)
SECURITY DEFINER. Credits the caller's wallet with p_amount (must be > 0).
Records a 'deposit' transaction. Returns the updated wallet.

## Security (RLS)

### wallets
- SELECT: authenticated users can read ONLY their own wallet
- No INSERT/UPDATE/DELETE policies — all mutations go through SECURITY DEFINER RPCs

### wallet_transactions
- SELECT: authenticated users can read ONLY their own transactions
- No INSERT/UPDATE/DELETE policies — all writes go through SECURITY DEFINER RPCs

## Money Representation
All monetary values are bigint (integer toman). No floating-point.
Consistent with the auction engine.

## Important Notes
1. Users CANNOT directly modify wallet balances — only through RPCs
2. Users CANNOT directly insert transactions — only through RPCs
3. The get_or_create_wallet RPC uses INSERT ON CONFLICT to handle race conditions
4. deposit_wallet is the foundation for future payment gateway integration
5. The transaction ledger is append-only for audit integrity
*/

-- ============================================================
-- 1. Create wallets table
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance bigint NOT NULL DEFAULT 0,
  locked_balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Constraints on wallets
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_available_balance_check'
  ) THEN
    ALTER TABLE wallets ADD CONSTRAINT wallets_available_balance_check
      CHECK (available_balance >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_locked_balance_check'
  ) THEN
    ALTER TABLE wallets ADD CONSTRAINT wallets_locked_balance_check
      CHECK (locked_balance >= 0);
  END IF;
END $$;

-- ============================================================
-- 3. Create wallet_transactions table
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount bigint NOT NULL,
  balance_after bigint NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Constraints on wallet_transactions
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_type_check'
  ) THEN
    ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
      CHECK (type IN (
        'deposit', 'withdrawal', 'auction_bid', 'auction_refund',
        'direct_purchase', 'reward', 'daily_reward', 'referral_reward',
        'admin_adjustment'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_balance_after_check'
  ) THEN
    ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_balance_after_check
      CHECK (balance_after >= 0);
  END IF;
END $$;

-- ============================================================
-- 5. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
  ON wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at
  ON wallet_transactions(created_at DESC);

-- ============================================================
-- 6. Enable RLS
-- ============================================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS Policies — wallets (owner read only, no direct write)
-- ============================================================
DROP POLICY IF EXISTS "wallets_select_own" ON wallets;
CREATE POLICY "wallets_select_own"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies — all mutations via SECURITY DEFINER RPCs

-- ============================================================
-- 8. RLS Policies — wallet_transactions (owner read only, no direct write)
-- ============================================================
DROP POLICY IF EXISTS "wallet_transactions_select_own" ON wallet_transactions;
CREATE POLICY "wallet_transactions_select_own"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies — transactions are append-only via RPCs

-- ============================================================
-- 9. Updated_at trigger for wallets
-- ============================================================
CREATE OR REPLACE FUNCTION update_wallets_updated_at()
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

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallets_updated_at();

REVOKE EXECUTE ON FUNCTION update_wallets_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_wallets_updated_at() FROM anon, authenticated;

-- ============================================================
-- 10. get_or_create_wallet() RPC
--     Returns the caller's wallet, creating it if needed.
--     Uses INSERT ON CONFLICT to handle race conditions.
-- ============================================================
CREATE OR REPLACE FUNCTION get_or_create_wallet()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای دسترسی به کیف پول وارد حساب خود شوید');
  END IF;

  INSERT INTO wallets (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'wallet', jsonb_build_object(
      'user_id', v_wallet.user_id,
      'available_balance', v_wallet.available_balance,
      'locked_balance', v_wallet.locked_balance,
      'created_at', v_wallet.created_at,
      'updated_at', v_wallet.updated_at
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_or_create_wallet() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_or_create_wallet() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_wallet() TO authenticated;

-- ============================================================
-- 11. deposit_wallet(p_amount bigint) RPC
--      Credits the caller's wallet. Records a 'deposit' transaction.
--      Amount must be positive.
-- ============================================================
CREATE OR REPLACE FUNCTION deposit_wallet(p_amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شارژ کیف پول وارد حساب خود شوید');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ شارژ نامعتبر است');
  END IF;

  -- Lock the wallet row
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create wallet if it doesn't exist
    INSERT INTO wallets (user_id)
    VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_wallet
    FROM wallets
    WHERE user_id = auth.uid()
    FOR UPDATE;
  END IF;

  v_new_balance := v_wallet.available_balance + p_amount;

  -- Update wallet balance
  UPDATE wallets
  SET available_balance = v_new_balance
  WHERE user_id = auth.uid();

  -- Record the transaction
  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (auth.uid(), 'deposit', p_amount, v_new_balance, 'شارژ کیف پول');

  RETURN jsonb_build_object(
    'success', true,
    'wallet', jsonb_build_object(
      'user_id', v_wallet.user_id,
      'available_balance', v_new_balance,
      'locked_balance', v_wallet.locked_balance,
      'created_at', v_wallet.created_at,
      'updated_at', now()
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION deposit_wallet(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION deposit_wallet(bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION deposit_wallet(bigint) TO authenticated;