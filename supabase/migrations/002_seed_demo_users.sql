-- Seed demo users for testing
-- These are the default demo accounts mentioned in the README

-- Insert admin user
INSERT INTO public.users (name, email, role, password_hash)
VALUES ('admin', 'admin@stockflow.com', 'admin', 'demo_hash_admin123')
ON CONFLICT (email) DO NOTHING;

-- Insert second admin user
INSERT INTO public.users (name, email, role, password_hash)
VALUES ('admin2', 'admin2@stockflow.com', 'admin', 'demo_hash_admin123')
ON CONFLICT (email) DO NOTHING;

-- Insert guest user
INSERT INTO public.users (name, email, role, password_hash)
VALUES ('guest', 'guest@stockflow.com', 'guest', 'demo_hash_guest123')
ON CONFLICT (email) DO NOTHING;
