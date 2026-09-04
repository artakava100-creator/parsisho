/*
# Create get_homepage_auction RPC

## Purpose
Returns the single best public auction for the homepage showcase, plus the
current server time, in one round-trip.  This is a self-contained, read-only
function — it does NOT modify any auction lifecycle state.

## Selection Logic (strictly by real database status)
1. First priority: any auction with status IN ('live', 'ending') — the
   currently active auction, regardless of auction_date or starts_at.
2. Second priority: the nearest scheduled auction whose starts_at >= now(),
   ordered by starts_at ASC.
3. If neither exists, return NULL.

Hard exclusions: draft, cancelled, and ended auctions are never returned.
Stale scheduled auctions (starts_at < now()) are also excluded — they are an
inconsistent lifecycle state and must not be shown until the real status is
corrected by the Auction Management system.

## Returned Fields (public-safe only)
id, title, slug, description, status, auction_date, starts_at, ends_at,
starting_price, current_price, original_price, click_increment, click_cost,
click_count, participant_count, image_url, is_official, extension_used,
server_time.

No winner_user_id, winning_bid_id, or internal audit fields are returned.

## Security
- SECURITY DEFINER is NOT used — this is a plain function.
- EXECUTE granted to anon and authenticated so the anon-key frontend can call it.
- No RLS policy changes.
- No existing RPCs are modified.
*/

CREATE OR REPLACE FUNCTION public.get_homepage_auction()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    -- Priority 1: live or ending auction (regardless of date)
    (
      SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'slug', a.slug,
        'description', a.description,
        'status', a.status,
        'auction_date', a.auction_date,
        'starts_at', a.starts_at,
        'ends_at', a.ends_at,
        'starting_price', a.starting_price,
        'current_price', a.current_price,
        'original_price', a.original_price,
        'click_increment', a.click_increment,
        'click_cost', a.click_cost,
        'click_count', a.click_count,
        'participant_count', a.participant_count,
        'image_url', a.image_url,
        'is_official', a.is_official,
        'extension_used', a.extension_used,
        'server_time', now()::timestamptz
      )
      FROM public.auctions a
      WHERE a.status IN ('live', 'ending')
      ORDER BY
        CASE WHEN a.is_official THEN 0 ELSE 1 END,
        a.starts_at ASC
      LIMIT 1
    ),
    -- Priority 2: nearest future scheduled auction
    (
      SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'slug', a.slug,
        'description', a.description,
        'status', a.status,
        'auction_date', a.auction_date,
        'starts_at', a.starts_at,
        'ends_at', a.ends_at,
        'starting_price', a.starting_price,
        'current_price', a.current_price,
        'original_price', a.original_price,
        'click_increment', a.click_increment,
        'click_cost', a.click_cost,
        'click_count', a.click_count,
        'participant_count', a.participant_count,
        'image_url', a.image_url,
        'is_official', a.is_official,
        'extension_used', a.extension_used,
        'server_time', now()::timestamptz
      )
      FROM public.auctions a
      WHERE a.status = 'scheduled'
        AND a.starts_at >= now()
      ORDER BY
        CASE WHEN a.is_official THEN 0 ELSE 1 END,
        a.starts_at ASC
      LIMIT 1
    ),
    -- No auction available
    NULL
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_homepage_auction() TO anon, authenticated;
