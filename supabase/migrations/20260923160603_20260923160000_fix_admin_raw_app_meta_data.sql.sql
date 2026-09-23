-- Fix: Set raw_app_meta_data.role on the admin user so SECURITY DEFINER
-- admin RPCs that check auth.jwt() -> 'raw_app_meta_data' ->> 'role' can
-- authorize the user. The profiles.role was set to 'super_admin' by prior
-- migrations, but raw_app_meta_data was never updated, so every admin RPC
-- returned { success: false, error: 'unauthorized' }.

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'super_admin')
WHERE id = 'c41e5399-8849-48e7-ad9e-78554da6b449'
  AND (raw_app_meta_data ->> 'role') IS NULL;
