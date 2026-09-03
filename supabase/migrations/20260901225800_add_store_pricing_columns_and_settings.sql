/*
# Add pricing columns to store_orders + create store_settings table

## 1. store_orders: new columns
- `discount` (integer, NOT NULL, default 0) — discount amount applied at order time
- `payment_fee` (integer, NOT NULL, default 0) — payment/bank processing fee at order time

## 2. New table: store_settings
A single-row configuration table that admins update to control store-wide pricing behavior.
- `id` (int, primary key, always 1 — enforced by CHECK constraint)
- `shipping_mode` (text: 'free' | 'fixed' | 'provider' — default 'free')
- `fixed_shipping_fee` (integer, default 0 — used when shipping_mode = 'fixed')
- `shipping_provider` (text, nullable — identifier for external provider, e.g. 'post_iran')
- `payment_fee_type` (text: 'none' | 'percentage' | 'fixed' | 'combined' — default 'none')
- `payment_fee_percentage` (numeric(5,2), default 0 — percentage of subtotal, e.g. 2.50)
- `payment_fee_fixed_amount` (integer, default 0 — fixed fee in Parsi)
- `updated_at` (timestamptz, default now())
- `updated_by` (uuid, nullable — references auth.users, set when admin saves)

## 3. Security
- RLS enabled on store_settings.
- SELECT: any authenticated user can read settings (needed for checkout calculation).
- UPDATE: only admin/super_admin roles can update.
- INSERT: only admin/super_admin (for initial row creation).

## 4. Seed
- Insert a default settings row with id=1, shipping_mode='free', payment_fee_type='none'.
*/

-- ─── Add columns to store_orders ───
ALTER TABLE store_orders
  ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_fee integer NOT NULL DEFAULT 0;

-- ─── store_settings table ───
CREATE TABLE IF NOT EXISTS store_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  shipping_mode text NOT NULL DEFAULT 'free' CHECK (shipping_mode IN ('free', 'fixed', 'provider')),
  fixed_shipping_fee integer NOT NULL DEFAULT 0,
  shipping_provider text,
  payment_fee_type text NOT NULL DEFAULT 'none' CHECK (payment_fee_type IN ('none', 'percentage', 'fixed', 'combined')),
  payment_fee_percentage numeric(5,2) NOT NULL DEFAULT 0,
  payment_fee_fixed_amount integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read settings (needed for checkout price calculation)
DROP POLICY IF EXISTS "select_store_settings" ON store_settings;
CREATE POLICY "select_store_settings" ON store_settings FOR SELECT
  TO authenticated USING (true);

-- Only admin/super_admin can insert
DROP POLICY IF EXISTS "insert_store_settings_admin" ON store_settings;
CREATE POLICY "insert_store_settings_admin" ON store_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

-- Only admin/super_admin can update
DROP POLICY IF EXISTS "update_store_settings_admin" ON store_settings;
CREATE POLICY "update_store_settings_admin" ON store_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

-- ─── updated_at trigger ───
CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_settings_updated_at ON store_settings;
CREATE TRIGGER store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

-- ─── Seed default row ───
INSERT INTO store_settings (id, shipping_mode, fixed_shipping_fee, payment_fee_type, payment_fee_percentage, payment_fee_fixed_amount)
VALUES (1, 'free', 0, 'none', 0, 0)
ON CONFLICT (id) DO NOTHING;
