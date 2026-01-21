-- Allow super_admin role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'guest', 'super_admin'));

-- Site settings for logo and other config (key-value)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on site_settings" ON public.site_settings;
CREATE POLICY "Allow all on site_settings" ON public.site_settings
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;

-- Ensure logo_url key exists (empty = use default logo)
INSERT INTO public.site_settings (key, value) VALUES ('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- Set Anil (anil@stockflow.com) as super_admin with password Ahnsuil7917794@
-- Auth uses demo_hash_<password> for this project. Also supports 7917794 if only 003 was applied.
UPDATE public.users
SET role = 'super_admin', password_hash = 'demo_hash_Ahnsuil7917794@'
WHERE email = 'anil@stockflow.com';
