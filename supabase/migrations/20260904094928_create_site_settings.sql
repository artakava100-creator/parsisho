/*
# Create site_settings key-value store for Homepage Admin

1. New Tables
   - `site_settings`
     - `key` (text, primary key) — setting identifier
     - `value` (jsonb, not null) — setting payload
     - `updated_at` (timestamptz) — last modification time

2. Seed Data
   - Default homepage settings for intro, footer, social links, credentials, version

3. Security
   - RLS enabled
   - Authenticated + anon can SELECT (public read for homepage rendering)
   - Only admins can UPDATE via RPC
*/

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_site_settings" ON site_settings;
CREATE POLICY "anyone_can_read_site_settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "no_direct_insert_site_settings" ON site_settings;
CREATE POLICY "no_direct_insert_site_settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "no_direct_update_site_settings" ON site_settings;
CREATE POLICY "no_direct_update_site_settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_direct_delete_site_settings" ON site_settings;
CREATE POLICY "no_direct_delete_site_settings"
  ON site_settings FOR DELETE
  TO authenticated
  USING (false);

-- Admin RPC to upsert a setting
CREATE OR REPLACE FUNCTION admin_upsert_site_setting(p_key text, p_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('super_admin', 'admin', 'moderator') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  INSERT INTO site_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = p_value, updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin RPC to read all settings at once
CREATE OR REPLACE FUNCTION admin_get_all_site_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_result jsonb := '{}'::jsonb;
  v_row record;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('super_admin', 'admin', 'moderator') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  FOR v_row IN SELECT key, value FROM site_settings LOOP
    v_result := v_result || jsonb_build_object(v_row.key, v_row.value);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'settings', v_result);
END;
$$;

-- Seed default settings
INSERT INTO site_settings (key, value) VALUES
  ('homepage_intro', '{"title":"سرزمین پارسی شو","subtitle":"پلتفرم مزایده آنلاین، خرید مستقیم، سرگرمی و اقتصاد محلی","description":"در پارسی شو با هیجان مزایده خرید کنید، از تخفیف‌های ویژه بهره‌مند شوید و از کسب‌وکارهای محلی حمایت کنید.","visible":true}'::jsonb),
  ('homepage_auction_title', '{"title":"مزایده آنلاین پارسی شو"}'::jsonb),
  ('footer_copyright', '{"text":"تمامی حقوق برای تیم پارسی شو محفوظ است","version":"۴۰۵.۱"}'::jsonb),
  ('footer_social_links', '{"links":[{"id":"eitaa","title":"ایتا","url":"https://eitaa.com/parsisho","icon":"eitaa","visible":true},{"id":"telegram","title":"تلگرام","url":"https://t.me/parsisho","icon":"telegram","visible":true},{"id":"website","title":"وبسایت","url":"https://parsisho.ir","icon":"globe","visible":true}]}'::jsonb),
  ('footer_credentials', '{"enamad":{"image_url":"","link":"","visible":true},"business_license":{"image_url":"","link":"","visible":true}}'::jsonb),
  ('homepage_sections_order', '{"sections":["intro","auction_hero","quick_access","auction_hall"]}'::jsonb),
  ('auction_hall_categories', '{"categories":[{"id":"today","label":"مزایده امروز","icon":"flame","visible":true,"sort_order":1},{"id":"tomorrow","label":"مزایده فردا","icon":"calendar","visible":true,"sort_order":2},{"id":"day-after","label":"مزایده پس‌فردا","icon":"star","visible":true,"sort_order":3},{"id":"all","label":"همه مزایده‌ها","icon":"sparkles","visible":true,"sort_order":4}]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

REVOKE EXECUTE ON FUNCTION admin_upsert_site_setting(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_get_all_site_settings() FROM anon;
