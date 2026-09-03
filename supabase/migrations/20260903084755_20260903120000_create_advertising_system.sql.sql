-- ============================================================
-- P0.7 — Advertising Management System
-- Normalized schema for platform-wide ad management
-- ============================================================

-- 1. Ad Slots (page + placement definitions)
CREATE TABLE IF NOT EXISTS ad_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key   text NOT NULL UNIQUE,
  page        text NOT NULL,
  placement   text NOT NULL,
  devices     text[] NOT NULL DEFAULT '{desktop,mobile}',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Advertisements
CREATE TABLE IF NOT EXISTS advertisements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  image_url       text NOT NULL,
  destination_url text NOT NULL,
  is_active       boolean NOT NULL DEFAULT false,
  priority        integer NOT NULL DEFAULT 0,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Ad-to-Slot assignments
CREATE TABLE IF NOT EXISTS ad_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  ad_slot_id      uuid NOT NULL REFERENCES ad_slots(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(advertisement_id, ad_slot_id)
);

-- 4. Ad events (analytics foundation: impressions + clicks)
CREATE TABLE IF NOT EXISTS ad_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  ad_slot_id      uuid NOT NULL REFERENCES ad_slots(id) ON DELETE CASCADE,
  event_type      text NOT NULL DEFAULT 'impression',
  user_id         uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_assignments_slot ON ad_assignments(ad_slot_id);
CREATE INDEX IF NOT EXISTS idx_ad_assignments_ad ON ad_assignments(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON ad_events(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_slot ON ad_events(ad_slot_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON ad_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at);
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active);
CREATE INDEX IF NOT EXISTS idx_ad_slots_active ON ad_slots(is_active);

-- Enable RLS
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;

-- RLS: ad_slots — public read (anyone can see slot definitions)
CREATE POLICY "read_ad_slots" ON ad_slots FOR SELECT
  TO anon, authenticated USING (true);

-- RLS: advertisements — public read only active+scheduled
CREATE POLICY "read_active_advertisements" ON advertisements FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- RLS: ad_assignments — public read
CREATE POLICY "read_ad_assignments" ON ad_assignments FOR SELECT
  TO anon, authenticated USING (true);

-- RLS: ad_events — users can INSERT their own events (impression/click tracking)
CREATE POLICY "insert_ad_events" ON ad_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- RLS: ad_events — no SELECT for clients (analytics is admin-only via RPC)

-- ============================================================
-- Seed default ad slots
-- ============================================================
INSERT INTO ad_slots (slot_key, page, placement, devices) VALUES
  ('wallet_sidebar_left_top',    'wallet', 'sidebar_left_top',    '{desktop}'),
  ('wallet_sidebar_left_bottom', 'wallet', 'sidebar_left_bottom', '{desktop}'),
  ('shop_banner_top',            'shop',   'banner_top',           '{desktop,mobile}'),
  ('shop_sidebar',               'shop',   'sidebar',              '{desktop}'),
  ('auction_sidebar',            'auction','sidebar',              '{desktop}'),
  ('auction_between_sections',   'auction','between_sections',    '{desktop,mobile}'),
  ('local_sidebar',              'local',  'sidebar',              '{desktop}'),
  ('local_banner',               'local',  'banner',               '{desktop,mobile}')
ON CONFLICT (slot_key) DO NOTHING;

-- ============================================================
-- Admin RPC: resolve_ad_slot
-- Returns the highest-priority active advertisement for a given slot_key
-- considering device, scheduling, and priority
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_ad_slot(
  p_slot_key text,
  p_device text DEFAULT 'desktop'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'advertisement', to_jsonb(a.*),
    'slot', to_jsonb(s.*)
  )
  INTO v_result
  FROM ad_slots s
  JOIN ad_assignments aa ON aa.ad_slot_id = s.id
  JOIN advertisements a ON a.id = aa.advertisement_id
  WHERE s.slot_key = p_slot_key
    AND s.is_active = true
    AND a.is_active = true
    AND (p_device = ANY(s.devices))
    AND (a.starts_at IS NULL OR a.starts_at <= now())
    AND (a.ends_at IS NULL OR a.ends_at >= now())
  ORDER BY a.priority DESC, a.created_at ASC
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', true, 'advertisement', null, 'slot', null);
  END IF;

  RETURN jsonb_build_object('success', true, 'advertisement', v_result->'advertisement', 'slot', v_result->'slot');
END;
$$;

-- ============================================================
-- Admin RPC: track_ad_event
-- Records an impression or click event
-- ============================================================
CREATE OR REPLACE FUNCTION track_ad_event(
  p_advertisement_id uuid,
  p_ad_slot_id uuid,
  p_event_type text DEFAULT 'impression'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ad_events (advertisement_id, ad_slot_id, event_type, user_id)
  VALUES (p_advertisement_id, p_ad_slot_id, p_event_type, auth.uid());

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- Admin RPCs: CRUD for advertisements (admin-only)
-- ============================================================

CREATE OR REPLACE FUNCTION admin_create_advertisement(
  p_title text,
  p_image_url text,
  p_destination_url text,
  p_is_active boolean DEFAULT false,
  p_priority integer DEFAULT 0,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_slot_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad_id uuid;
  v_slot_id uuid;
  v_requester_role text;
BEGIN
  SELECT role INTO v_requester_role FROM profiles WHERE id = auth.uid();
  IF v_requester_role IS NULL OR v_requester_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  INSERT INTO advertisements (title, image_url, destination_url, is_active, priority, starts_at, ends_at)
  VALUES (p_title, p_image_url, p_destination_url, p_is_active, p_priority, p_starts_at, p_ends_at)
  RETURNING id INTO v_ad_id;

  IF p_slot_ids IS NOT NULL THEN
    FOREACH v_slot_id IN ARRAY p_slot_ids LOOP
      INSERT INTO ad_assignments (advertisement_id, ad_slot_id) VALUES (v_ad_id, v_slot_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'advertisement_id', v_ad_id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_advertisement(
  p_advertisement_id uuid,
  p_title text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_destination_url text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_priority integer DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_set_starts_null boolean DEFAULT false,
  p_set_ends_null boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_role text;
BEGIN
  SELECT role INTO v_requester_role FROM profiles WHERE id = auth.uid();
  IF v_requester_role IS NULL OR v_requester_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  UPDATE advertisements SET
    title = COALESCE(p_title, title),
    image_url = COALESCE(p_image_url, image_url),
    destination_url = COALESCE(p_destination_url, destination_url),
    is_active = COALESCE(p_is_active, is_active),
    priority = COALESCE(p_priority, priority),
    starts_at = CASE WHEN p_set_starts_null THEN NULL ELSE COALESCE(p_starts_at, starts_at) END,
    ends_at = CASE WHEN p_set_ends_null THEN NULL ELSE COALESCE(p_ends_at, ends_at) END,
    updated_at = now()
  WHERE id = p_advertisement_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_advertisement(
  p_advertisement_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_role text;
BEGIN
  SELECT role INTO v_requester_role FROM profiles WHERE id = auth.uid();
  IF v_requester_role IS NULL OR v_requester_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  DELETE FROM advertisements WHERE id = p_advertisement_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_advertisements(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_role text;
  v_result jsonb;
BEGIN
  SELECT role INTO v_requester_role FROM profiles WHERE id = auth.uid();
  IF v_requester_role IS NULL OR v_requester_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'image_url', a.image_url,
    'destination_url', a.destination_url,
    'is_active', a.is_active,
    'priority', a.priority,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'created_at', a.created_at,
    'updated_at', a.updated_at,
    'slot_ids', COALESCE((SELECT jsonb_agg(aa.ad_slot_id) FROM ad_assignments aa WHERE aa.advertisement_id = a.id), '[]'::jsonb)
  )), '[]'::jsonb) INTO v_result
  FROM advertisements a
  ORDER BY a.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object('success', true, 'advertisements', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_ad_slots(
  p_advertisement_id uuid,
  p_slot_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_role text;
  v_slot_id uuid;
BEGIN
  SELECT role INTO v_requester_role FROM profiles WHERE id = auth.uid();
  IF v_requester_role IS NULL OR v_requester_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  DELETE FROM ad_assignments WHERE advertisement_id = p_advertisement_id;

  IF p_slot_ids IS NOT NULL THEN
    FOREACH v_slot_id IN ARRAY p_slot_ids LOOP
      INSERT INTO ad_assignments (advertisement_id, ad_slot_id) VALUES (p_advertisement_id, v_slot_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_ad_analytics(
  p_advertisement_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_role text;
  v_result jsonb;
BEGIN
  SELECT role INTO v_requester_role FROM profiles WHERE id = auth.uid();
  IF v_requester_role IS NULL OR v_requester_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF p_advertisement_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'impressions', COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0),
      'clicks', COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0)
    ) INTO v_result
    FROM ad_events
    WHERE advertisement_id = p_advertisement_id;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'advertisement_id', a.id,
      'title', a.title,
      'impressions', COALESCE(e.impressions, 0),
      'clicks', COALESCE(e.clicks, 0)
    )), '[]'::jsonb) INTO v_result
    FROM advertisements a
    LEFT JOIN (
      SELECT advertisement_id,
        SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS impressions,
        SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks
      FROM ad_events GROUP BY advertisement_id
    ) e ON e.advertisement_id = a.id
    ORDER BY a.created_at DESC;
  END IF;

  RETURN jsonb_build_object('success', true, 'analytics', v_result);
END;
$$;

-- ============================================================
-- Grant EXECUTE on public RPCs, keep admin RPCs restricted
-- ============================================================
REVOKE EXECUTE ON FUNCTION resolve_ad_slot(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION resolve_ad_slot(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION resolve_ad_slot(text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION track_ad_event(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION track_ad_event(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION track_ad_event(uuid, uuid, text) TO anon, authenticated;

-- Admin RPCs: no grants to anon or authenticated (admin-only via auth check inside)
REVOKE EXECUTE ON FUNCTION admin_create_advertisement(text, text, text, boolean, integer, timestamptz, timestamptz, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_create_advertisement(text, text, text, boolean, integer, timestamptz, timestamptz, uuid[]) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_update_advertisement(uuid, text, text, text, boolean, integer, timestamptz, timestamptz, boolean, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_update_advertisement(uuid, text, text, text, boolean, integer, timestamptz, timestamptz, boolean, boolean) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_delete_advertisement(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_delete_advertisement(uuid) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_list_advertisements(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_list_advertisements(integer, integer) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_set_ad_slots(uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_set_ad_slots(uuid, uuid[]) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION admin_get_ad_analytics(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_get_ad_analytics(uuid) FROM anon, authenticated;

-- Grant EXECUTE on admin RPCs to authenticated (the function-level auth check enforces admin-only)
GRANT EXECUTE ON FUNCTION admin_create_advertisement(text, text, text, boolean, integer, timestamptz, timestamptz, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_advertisement(uuid, text, text, text, boolean, integer, timestamptz, timestamptz, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_advertisement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_advertisements(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_ad_slots(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_ad_analytics(uuid) TO authenticated;