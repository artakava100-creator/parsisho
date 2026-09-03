/*
# Revoke EXECUTE on trigger functions from anon and authenticated roles

## Purpose
The SECURITY DEFINER trigger functions `handle_new_user()`, `protect_profile_fields()`,
and `update_profiles_updated_at()` had explicit EXECUTE grants to `anon` and
`authenticated` roles. These are internal trigger functions that should never be
called directly via the REST API. This migration revokes EXECUTE from both roles.

## Changes
- REVOKE EXECUTE on all three trigger functions FROM anon
- REVOKE EXECUTE on all three trigger functions FROM authenticated

Triggers still work because they execute with the table owner's privileges,
not the calling role's.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_profiles_updated_at() FROM anon, authenticated;
