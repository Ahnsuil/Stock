-- Add user Anil with password 7917794
INSERT INTO public.users (name, email, role, password_hash)
VALUES ('Anil', 'anil@stockflow.com', 'admin', 'demo_hash_7917794')
ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;
