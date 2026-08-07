-- Table for storing system settings (such as shared Google Drive OAuth connection)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow service_role / server full access
DROP POLICY IF EXISTS "Allow server access to system_settings" ON public.system_settings;
CREATE POLICY "Allow server access to system_settings"
  ON public.system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
