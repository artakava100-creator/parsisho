/*
# Create Newsletter Subscribers System

## Overview
Creates a dedicated database table and SECURITY DEFINER RPCs for managing
newsletter subscribers. The Footer signup form will call a public RPC to
subscribe emails, and admins can manage subscribers through a dedicated
admin page.

## New Tables
- `newsletter_subscribers`
  - `id` (uuid, PK, default gen_random_uuid())
  - `email` (text, NOT NULL, UNIQUE) — subscriber email address, stored lowercase
  - `status` (text, NOT NULL, default 'active') — 'active' or 'unsubscribed'
  - `subscribed_at` (timestamptz, default now()) — when the user subscribed
  - `unsubscribed_at` (timestamptz, nullable) — when the user unsubscribed
  - `updated_at` (timestamptz, default now()) — last modification time
  - `source` (text, default 'footer') — where the subscription came from

## Security
- RLS enabled on `newsletter_subscribers`.
- No direct SELECT/INSERT/UPDATE/DELETE policies for any role.
- Public subscribe goes through `subscribe_newsletter(p_email)` SECURITY DEFINER RPC.
- All admin operations go through `admin_*` SECURITY DEFINER RPCs that check `is_admin_user()`.

## RPCs (all SECURITY DEFINER, search_path = public)
1. `subscribe_newsletter(p_email)` — public subscribe (validates email, prevents duplicates, reactivates unsubscribed)
2. `admin_list_newsletter_subscribers(p_search, p_status_filter, p_page, p_page_size)` — paginated list (admin only)
3. `admin_update_subscriber_status(p_subscriber_id, p_status)` — update status (admin only)
4. `admin_delete_subscriber(p_subscriber_id)` — delete subscriber (admin only)
5. `admin_newsletter_stats()` — subscriber count stats (admin only)
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. CREATE TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'footer'
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email_lower ON newsletter_subscribers (lower(email));

-- ═══════════════════════════════════════════════════════════════
-- 2. ENABLE RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- No direct policies — all access through SECURITY DEFINER RPCs

-- ═══════════════════════════════════════════════════════════════
-- 3. PUBLIC SUBSCRIBE RPC
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_existing record;
BEGIN
  -- Normalize and validate email
  v_email := lower(btrim(p_email));

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ایمیل الزامی است');
  END IF;

  -- Basic email format check
  IF v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'فرمت ایمیل نامعتبر است');
  END IF;

  -- Check if already exists
  SELECT * INTO v_existing FROM public.newsletter_subscribers WHERE email = v_email;

  IF FOUND THEN
    -- If unsubscribed, reactivate
    IF v_existing.status = 'unsubscribed' THEN
      UPDATE public.newsletter_subscribers
      SET status = 'active', unsubscribed_at = NULL, updated_at = now()
      WHERE email = v_email;
      RETURN jsonb_build_object('success', true, 'message', 'اشتراک شما دوباره فعال شد');
    END IF;
    -- Already active
    RETURN jsonb_build_object('success', true, 'message', 'ایمیل شما قبلاً ثبت شده است');
  END IF;

  -- New subscription
  INSERT INTO public.newsletter_subscribers (email, status, source)
  VALUES (v_email, 'active', 'footer');

  RETURN jsonb_build_object('success', true, 'message', 'ایمیل شما در خبرنامه ثبت شد');
END;
$function$;

-- ═══════════════════════════════════════════════════════════════
-- 4. ADMIN RPCs (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════

-- 4a. LIST SUBSCRIBERS (admin only, paginated)
CREATE OR REPLACE FUNCTION public.admin_list_newsletter_subscribers(
  p_search text DEFAULT NULL,
  p_status_filter text DEFAULT 'all',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset integer;
  v_total integer;
  v_items jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);

  -- Count total matching
  SELECT count(*) INTO v_total
  FROM public.newsletter_subscribers s
  WHERE (
    p_search IS NULL OR p_search = '' OR
    s.email ILIKE '%' || p_search || '%'
  ) AND (
    p_status_filter = 'all' OR s.status = p_status_filter
  );

  -- Fetch page
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'status', s.status,
    'subscribed_at', s.subscribed_at,
    'unsubscribed_at', s.unsubscribed_at,
    'updated_at', s.updated_at,
    'source', s.source
  ) ORDER BY s.subscribed_at DESC), '[]'::jsonb) INTO v_items
  FROM (
    SELECT *
    FROM public.newsletter_subscribers
    WHERE (
      p_search IS NULL OR p_search = '' OR
      email ILIKE '%' || p_search || '%'
    ) AND (
      p_status_filter = 'all' OR status = p_status_filter
    )
    ORDER BY subscribed_at DESC
    LIMIT GREATEST(p_page_size, 1)
    OFFSET v_offset
  ) s;

  RETURN jsonb_build_object(
    'success', true,
    'items', v_items,
    'total', v_total,
    'page', GREATEST(p_page, 1),
    'page_size', GREATEST(p_page_size, 1)
  );
END;
$function$;

-- 4b. UPDATE SUBSCRIBER STATUS (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_subscriber_status(
  p_subscriber_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF p_status NOT IN ('active', 'unsubscribed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'وضعیت نامعتبر است');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.newsletter_subscribers WHERE id = p_subscriber_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'مشترک یافت نشد');
  END IF;

  UPDATE public.newsletter_subscribers
  SET
    status = p_status,
    unsubscribed_at = CASE WHEN p_status = 'unsubscribed' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_subscriber_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 4c. DELETE SUBSCRIBER (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_subscriber(
  p_subscriber_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.newsletter_subscribers WHERE id = p_subscriber_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'مشترک یافت نشد');
  END IF;

  DELETE FROM public.newsletter_subscribers WHERE id = p_subscriber_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 4d. NEWSLETTER STATS (admin only)
CREATE OR REPLACE FUNCTION public.admin_newsletter_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total', (SELECT count(*) FROM public.newsletter_subscribers),
    'active', (SELECT count(*) FROM public.newsletter_subscribers WHERE status = 'active'),
    'unsubscribed', (SELECT count(*) FROM public.newsletter_subscribers WHERE status = 'unsubscribed')
  );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════
-- 5. REVOKE EXECUTE ON ADMIN RPCs FROM NON-ADMIN ROLES
-- ═══════════════════════════════════════════════════════════════

-- subscribe_newsletter is callable by anyone (public subscribe)
-- admin_* functions are restricted to authenticated only
REVOKE EXECUTE ON FUNCTION public.admin_list_newsletter_subscribers(text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_newsletter_subscribers(text, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_subscriber_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_subscriber_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_subscriber(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_subscriber(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_newsletter_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_newsletter_stats() FROM anon;
