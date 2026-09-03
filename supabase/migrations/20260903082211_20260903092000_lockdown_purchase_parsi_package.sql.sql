/*
# Lock Down purchase_parsi_package RPC (SEC-006 / FIN-003)

## Purpose
Close the confirmed P0 financial vulnerability: any authenticated user could
call purchase_parsi_package(uuid) directly to obtain unlimited free Parsi
wallet credit without payment verification.

## Change
Revoke EXECUTE on purchase_parsi_package from authenticated and anon.
The function body is NOT modified. SECURITY DEFINER and search_path are NOT
changed. The function is NOT dropped — it may be reused internally by a
future gateway callback, but no client role may call it.

## Scope
- purchase_parsi_package privileges only
- No changes to function body, tables, RLS, other RPCs, or frontend
*/

REVOKE EXECUTE ON FUNCTION public.purchase_parsi_package(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_parsi_package(uuid) FROM anon;
