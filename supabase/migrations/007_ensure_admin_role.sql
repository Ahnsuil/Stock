-- Ensure admin and admin2 always have role='admin'
UPDATE public.users
SET role = 'admin'
WHERE LOWER(name) IN ('admin', 'admin2');

-- Ensure admin2 exists (in case 002 seed was not run)
INSERT INTO public.users (name, email, role, password_hash)
VALUES ('admin2', 'admin2@stockflow.com', 'admin', 'demo_hash_admin123')
ON CONFLICT (email) DO UPDATE SET role = 'admin', name = EXCLUDED.name, password_hash = EXCLUDED.password_hash;
