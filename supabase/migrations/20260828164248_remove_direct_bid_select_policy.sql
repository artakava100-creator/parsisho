/*
# Phase 3 Final Gate: Remove direct SELECT on bids table

## Purpose
The `bids` table has a SELECT policy (`authenticated_read_bids`) that allows any
authenticated user to directly query raw bid rows. This exposes `user_id` (the
auth UUID of the bidder), which is private information.

The secure access path for bid history is the `get_auction_detail()` RPC, which
returns masked bidder names (e.g., "حمید ر.") and does NOT expose user_id, email,
phone, or any private profile fields.

## Change
Drop the `authenticated_read_bids` SELECT policy on the `bids` table.

After this change:
- Users CANNOT directly SELECT from `bids` — no policy allows it
- Users CAN still see bid history via `get_auction_detail()` RPC (SECURITY DEFINER)
- The RPC returns masked bidder names and `is_own_bid` flag (via auth.uid())
- No private user information is exposed

## Security Impact
Before: authenticated user could `SELECT user_id, amount FROM bids` — exposing auth UUIDs
After:  authenticated user can only see bids through the sanitized RPC

## RLS Still Enabled
RLS remains enabled on `bids`. With no SELECT policy, all direct queries return
zero rows for client roles. The `place_bid` RPC (SECURITY DEFINER) can still insert
bids because it runs as the function owner, bypassing RLS.
*/

DROP POLICY IF EXISTS "authenticated_read_bids" ON bids;
