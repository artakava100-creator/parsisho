-- Promote حمید to super_admin
UPDATE public.profiles
SET role = 'super_admin', updated_at = now()
WHERE id = 'c41e5399-8849-48e7-ad9e-78554da6b449';

-- Verify
SELECT id, display_name, role FROM public.profiles WHERE id = 'c41e5399-8849-48e7-ad9e-78554da6b449';