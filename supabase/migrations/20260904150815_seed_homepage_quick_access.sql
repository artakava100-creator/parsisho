/*
# Seed homepage_quick_access site setting

1. Purpose
   Seeds the `homepage_quick_access` key in the existing `site_settings`
   key-value store with the 4 default Quick Access strip items shown on
   the homepage directly below the Hero Slider.

2. Data
   Each item carries: id, label, destination link, icon identifier,
   active flag, and display order.
   - تالار مزایده → /auctions → gavel
   - بازارگردی → /market → store
   - سرزمین هیجان → /excitement → gamepad
   - محله کسب و کار → /businesses → building

3. Security
   No new tables, no new RPCs, no new RLS policies. The existing
   `anyone_can_read_site_settings` SELECT policy (anon, authenticated)
   and the `admin_upsert_site_setting` SECURITY DEFINER RPC already
   cover reading and admin-managed writing of this key.

4. Notes
   Uses ON CONFLICT (key) DO NOTHING so existing settings are never
   overwritten. Safe to re-run.
*/

INSERT INTO site_settings (key, value)
VALUES (
  'homepage_quick_access',
  '{
    "items": [
      {"id":"auction-hall","label":"تالار مزایده","link":"/auctions","icon":"gavel","active":true,"sort_order":1},
      {"id":"marketplace","label":"بازارگردی","link":"/market","icon":"store","active":true,"sort_order":2},
      {"id":"excitement","label":"سرزمین هیجان","link":"/excitement","icon":"gamepad","active":true,"sort_order":3},
      {"id":"businesses","label":"محله کسب و کار","link":"/businesses","icon":"building","active":true,"sort_order":4}
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
