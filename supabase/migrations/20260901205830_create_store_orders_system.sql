/*
# Create store orders system

1. New Tables
- `store_orders`: Main order record for store purchases.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users)
  - `order_number` (text, unique, human-readable order number)
  - `status` (text, defaults to 'pending' — pending, confirmed, shipped, delivered, cancelled)
  - `subtotal` (integer, sum of all item prices in Parsi)
  - `shipping_cost` (integer, shipping cost in Parsi, default 0)
  - `total` (integer, final payable amount in Parsi)
  - `customer_name` (text, not null)
  - `mobile_number` (text, not null)
  - `province` (text, not null)
  - `city` (text, not null)
  - `address` (text, not null)
  - `postal_code` (text, not null)
  - `delivery_note` (text, nullable)
  - `payment_status` (text, defaults to 'unpaid' — unpaid, pending, paid, failed)
  - `created_at` (timestamptz, defaults to now)
  - `updated_at` (timestamptz, defaults to now)

- `store_order_items`: Individual line items within an order.
  - `id` (uuid, primary key)
  - `order_id` (uuid, not null, references store_orders, cascade delete)
  - `product_id` (text, not null — matches in-memory product IDs)
  - `product_name` (text, not null)
  - `product_image` (text, nullable — image URL at time of purchase)
  - `unit_price` (integer, not null — price per unit in Parsi)
  - `quantity` (integer, not null, check >= 1)
  - `subtotal` (integer, not null — unit_price * quantity)

2. Security
- Enable RLS on both tables.
- Owner-scoped CRUD: each authenticated user can only access their own orders and order items.
- `user_id` defaults to `auth.uid()` so inserts from the client succeed.
- Order items are scoped through the parent order's ownership.

3. Indexes
- `store_orders_user_id_idx` for querying orders by user.
- `store_order_items_order_id_idx` for querying items by order.
*/

-- ─── store_orders ───
CREATE TABLE IF NOT EXISTS store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal integer NOT NULL DEFAULT 0,
  shipping_cost integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  customer_name text NOT NULL,
  mobile_number text NOT NULL,
  province text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  postal_code text NOT NULL,
  delivery_note text,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_store_orders" ON store_orders;
CREATE POLICY "select_own_store_orders" ON store_orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_store_orders" ON store_orders;
CREATE POLICY "insert_own_store_orders" ON store_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_store_orders" ON store_orders;
CREATE POLICY "update_own_store_orders" ON store_orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_store_orders" ON store_orders;
CREATE POLICY "delete_own_store_orders" ON store_orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS store_orders_user_id_idx ON store_orders(user_id);

-- ─── store_order_items ───
CREATE TABLE IF NOT EXISTS store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_image text,
  unit_price integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity >= 1),
  subtotal integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_store_order_items" ON store_order_items;
CREATE POLICY "select_own_store_order_items" ON store_order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM store_orders WHERE store_orders.id = store_order_items.order_id AND store_orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_store_order_items" ON store_order_items;
CREATE POLICY "insert_own_store_order_items" ON store_order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM store_orders WHERE store_orders.id = store_order_items.order_id AND store_orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_store_order_items" ON store_order_items;
CREATE POLICY "update_own_store_order_items" ON store_order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM store_orders WHERE store_orders.id = store_order_items.order_id AND store_orders.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM store_orders WHERE store_orders.id = store_order_items.order_id AND store_orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_store_order_items" ON store_order_items;
CREATE POLICY "delete_own_store_order_items" ON store_order_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM store_orders WHERE store_orders.id = store_order_items.order_id AND store_orders.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS store_order_items_order_id_idx ON store_order_items(order_id);

-- ─── updated_at trigger for store_orders ───
CREATE OR REPLACE FUNCTION update_store_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_orders_updated_at ON store_orders;
CREATE TRIGGER store_orders_updated_at
  BEFORE UPDATE ON store_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_store_orders_updated_at();
