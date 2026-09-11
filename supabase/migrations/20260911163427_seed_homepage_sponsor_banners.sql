/*
# Seed default sponsor banners setting

1. Purpose
   - Seeds the `homepage_sponsor_banners` key in `site_settings` with 5 empty banner slots.
   - Each slot has: `image_url` (string), `link_url` (string), `visible` (boolean).
   - This gives the admin 5 ready-to-fill banner templates on first load.

2. Table affected
   - `site_settings` (existing key-value store, no schema changes)

3. Security
   - No new tables, no RLS changes, no new RPCs.
   - Uses the existing `admin_upsert_site_setting` RPC pattern is NOT needed here —
     this is a seed INSERT with ON CONFLICT DO NOTHING.

4. Notes
   - Only slots with a non-empty `image_url` and `visible: true` will render on the homepage.
*/

INSERT INTO site_settings (key, value)
VALUES (
  'homepage_sponsor_banners',
  '{"banners":[{"image_url":"","link_url":"","visible":true},{"image_url":"","link_url":"","visible":true},{"image_url":"","link_url":"","visible":true},{"image_url":"","link_url":"","visible":true},{"image_url":"","link_url":"","visible":true}]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
