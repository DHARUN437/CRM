-- Table for storing system settings (such as shared Google Drive OAuth connection)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- SECURITY FIX: the previous version omitted `TO <role>`, which defaulted to
-- `public` and let ANONYMOUS users read/write system_settings — including the
-- `google_drive_connection` row that stores the OAuth refresh token.

-- Service role / server full access.
DROP POLICY IF EXISTS "Allow server access to system_settings" ON public.system_settings;
CREATE POLICY "system_settings_service_all" ON public.system_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- All staff (team / admin / tl / worker) may read the connection so server
-- helpers (settings status, Drive uploads via getStoredRefreshToken) work with
-- their session. Clients and anonymous users are excluded.
DROP POLICY IF EXISTS "system_settings_staff_read" ON public.system_settings;
CREATE POLICY "system_settings_staff_read" ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- Only admins (team / admin) may create / change / delete settings rows.
DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_admin_write" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_team())
  WITH CHECK (public.is_team());
