/*
# Create Homepage Advertisement Slots

1. New Data
  - Inserts three ad_slots records for the homepage hero section:
    - home_hero_1 (page: home, placement: hero_sidebar)
    - home_hero_2 (page: home, placement: hero_sidebar)
    - home_hero_3 (page: home, placement: hero_sidebar)
  - All slots support desktop and mobile devices
  - All slots are active by default

2. Important Notes
  - Uses INSERT ... ON CONFLICT to be idempotent
  - Does NOT modify the ad_slots table structure
  - Integrates with the existing resolve_ad_slot RPC
*/

INSERT INTO ad_slots (slot_key, page, placement, devices, is_active)
VALUES
  ('home_hero_1', 'home', 'hero_sidebar', ARRAY['desktop','mobile'], true),
  ('home_hero_2', 'home', 'hero_sidebar', ARRAY['desktop','mobile'], true),
  ('home_hero_3', 'home', 'hero_sidebar', ARRAY['desktop','mobile'], true)
ON CONFLICT (slot_key) DO NOTHING;
