-- Temporarily disable the protect_profile_fields trigger to allow role promotion
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_fields;

-- Promote حمید to super_admin
UPDATE public.profiles
SET role = 'super_admin', updated_at = now()
WHERE id = 'c41e5399-8849-48e7-ad9e-78554da6b449';

-- Re-enable the trigger
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_fields;