/*
# Create market_prices table — live price ticker cache

1. Purpose
   Stores the latest fetched prices for gold, coins, currencies, and cryptocurrencies
   so the homepage ticker can display live data without calling external APIs from the browser.

2. New Tables
   - `market_prices`
     - `id` (int, primary key, auto-increment)
     - `category` (text, not null) — 'gold' | 'currency' | 'crypto'
     - `symbol` (text, not null, unique) — internal symbol key e.g. 'gold_18k', 'usd', 'bitcoin'
     - `name_fa` (text, not null) — Persian display name
     - `price` (numeric, not null) — current price
     - `unit` (text, not null) — e.g. 'تومان', 'دلار'
     - `change_percent` (numeric, not null, default 0) — 24h change percentage
     - `sort_order` (int, not null, default 0) — display ordering within category
     - `updated_at` (timestamptz, not null, default now()) — last fetch time

3. Security
   - Enable RLS on `market_prices`.
   - This is a public, read-only price ticker — all visitors (anon + authenticated) can SELECT.
   - No INSERT/UPDATE/DELETE policies: writes happen only via the service-role key in the edge function.

4. Notes
   - The edge function `fetch-market-prices` will upsert rows using the service role key.
   - The frontend reads via the anon key (SELECT only).
*/

CREATE TABLE IF NOT EXISTS market_prices (
  id serial PRIMARY KEY,
  category text NOT NULL,
  symbol text NOT NULL UNIQUE,
  name_fa text NOT NULL,
  price numeric NOT NULL,
  unit text NOT NULL,
  change_percent numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_market_prices" ON market_prices;
CREATE POLICY "anon_read_market_prices"
  ON market_prices FOR SELECT
  TO anon, authenticated
  USING (true);

-- Index for efficient category + sort_order queries
CREATE INDEX IF NOT EXISTS idx_market_prices_category_sort
  ON market_prices (category, sort_order);
