/*
# Revoke EXECUTE on trigger functions from anon and authenticated

## Purpose
The SECURITY DEFINER functions `handle_new_user()` and `protect_profile_fields()`
are trigger functions — they should only be called by the database trigger system,
never directly via the REST API or RPC. The security advisor flagged that both
functions are callable by anon and authenticated roles via `/rest/v1/rpc/`.

## Changes
1. REVOKE EXECUTE on `handle_new_user()` from PUBLIC (covers anon + authenticated)
2. REVOKE EXECUTE on `protect_profile_fields()` from PUBLIC
3. REVOKE EXECUTE on `update_profiles_updated_at()` from PUBLIC (same reasoning)

These functions remain callable by the trigger system because triggers run with
the table owner's privileges, not the calling role's.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_profiles_updated_at() FROM PUBLIC;
