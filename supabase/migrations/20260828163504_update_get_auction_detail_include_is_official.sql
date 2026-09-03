/*
# Update get_auction_detail to include is_official field

## Purpose
The `get_auction_detail` RPC was created before the `is_official` column was added.
This update adds `is_official` to the auction data returned by the RPC.

## Changes
- Updated `get_auction_detail()` to include `is_official` in the returned auction object
*/

CREATE OR REPLACE FUNCTION get_auction_detail(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_bids jsonb;
BEGIN
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  -- Get bid history with masked bidder names
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'amount', b.amount,
      'bidder_name', CASE
        WHEN LENGTH(p.display_name) > 0 THEN
          CASE
            WHEN POSITION(' ' IN p.display_name) > 0 THEN
              LEFT(p.display_name, POSITION(' ' IN p.display_name) - 1) || ' ' || LEFT(SPLIT_PART(p.display_name, ' ', 2), 1) || '.'
            ELSE
              LEFT(p.display_name, 3) || '***'
          END
        ELSE 'کاربر پارسیشو'
      END,
      'is_winning', b.is_winning,
      'created_at', b.created_at,
      'bid_sequence', b.bid_sequence,
      'is_own_bid', b.user_id = auth.uid()
    )
    ORDER BY b.amount DESC, b.created_at ASC
  ), '[]'::jsonb) INTO v_bids
  FROM bids b
  LEFT JOIN profiles p ON p.id = b.user_id
  WHERE b.auction_id = p_auction_id;

  RETURN jsonb_build_object(
    'success', true,
    'auction', jsonb_build_object(
      'id', v_auction.id,
      'title', v_auction.title,
      'slug', v_auction.slug,
      'description', v_auction.description,
      'status', v_auction.status,
      'auction_date', v_auction.auction_date,
      'starts_at', v_auction.starts_at,
      'ends_at', v_auction.ends_at,
      'starting_price', v_auction.starting_price,
      'current_price', v_auction.current_price,
      'min_bid_increment', v_auction.min_bid_increment,
      'bid_count', v_auction.bid_count,
      'winner_user_id', v_auction.winner_user_id,
      'image_url', v_auction.image_url,
      'product_name', v_auction.product_name,
      'is_official', v_auction.is_official,
      'created_at', v_auction.created_at
    ),
    'bids', v_bids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_auction_detail(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_auction_detail(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auction_detail(uuid) TO anon, authenticated;
