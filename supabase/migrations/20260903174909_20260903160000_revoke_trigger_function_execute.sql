-- Revoke EXECUTE on trigger functions from anon (defense-in-depth)
-- These are trigger functions, not directly callable via API,
-- but revoking anon execute follows security best practices.

REVOKE EXECUTE ON FUNCTION public.update_store_orders_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_store_settings_updated_at() FROM PUBLIC, anon;