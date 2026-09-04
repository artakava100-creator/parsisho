/*
# Drop Obsolete create_auction and update_auction Overloads

## Root Cause
The live database contains TWO overloads of `create_auction`:
  - 11-param version (oid 17714) — created by the original admin_auction_rpcs migration
  - 14-param version (oid 18057) — created by the click_auction_model migration

The frontend (AdminAuctionService.create) sends all 14 named parameters. PostgREST
cannot disambiguate between the two overloads when named parameters are used, because
the 11-param version also matches (its missing params have defaults). This causes a
"could not choose the best candidate function" error, which surfaces as a generic
auction creation failure in the Admin UI.

The same ambiguity exists for `update_auction`:
  - 5-param version (oid 17715) — original
  - 8-param version (oid 18058) — click model version

## Changes
1. DROP the obsolete 11-param `create_auction(text, text, date, timestamptz, timestamptz,
   bigint, text, bigint, boolean, text, text)`.
2. DROP the obsolete 5-param `update_auction(uuid, text, text, text, text)`.
3. Keep the current 14-param `create_auction` and 8-param `update_auction` unchanged.

## Security
- No RLS changes.
- No business logic changes.
- No data migration.
- Only obsolete function signatures are removed; the current implementations remain intact.
*/

-- 1. Drop obsolete 11-param create_auction overload
DROP FUNCTION IF EXISTS public.create_auction(
  text, text, date, timestamptz, timestamptz, bigint, text, bigint, boolean, text, text
);

-- 2. Drop obsolete 5-param update_auction overload
DROP FUNCTION IF EXISTS public.update_auction(
  uuid, text, text, text, text
);
