-- ============================================================================
-- AgencyOS — End of Day (EOD) Daily Reports & Attachments
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- 1. eod_reports table
CREATE TABLE IF NOT EXISTS public.eod_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date  DATE NOT NULL DEFAULT current_date,
  work_summary TEXT NOT NULL,
  blockers     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT eod_reports_employee_date_unique UNIQUE (employee_id, report_date)
);

-- 2. eod_report_attachments table
CREATE TABLE IF NOT EXISTS public.eod_report_attachments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eod_report_id        UUID NOT NULL REFERENCES public.eod_reports(id) ON DELETE CASCADE,
  google_drive_file_id TEXT NOT NULL,
  file_name            TEXT NOT NULL,
  file_url             TEXT,
  file_size            BIGINT,
  mime_type            TEXT,
  uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.eod_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_report_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eod_reports
-- Service role / admins can manage all reports
DROP POLICY IF EXISTS "eod_reports_service_all" ON public.eod_reports;
CREATE POLICY "eod_reports_service_all" ON public.eod_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view their own reports or team reports if team member
DROP POLICY IF EXISTS "eod_reports_select" ON public.eod_reports;
CREATE POLICY "eod_reports_select" ON public.eod_reports
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR public.is_team()
  );

-- Staff (team/admin/tl/worker) can submit reports for themselves. Clients must
-- NOT be able to create EOD entries. SECURITY: previously this was only
-- `employee_id = auth.uid()`, which let any authenticated user (including
-- clients) insert report rows that then flooded the admin EOD feed.
DROP POLICY IF EXISTS "eod_reports_insert" ON public.eod_reports;
CREATE POLICY "eod_reports_insert" ON public.eod_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    AND (
      public.is_team()
      OR public.is_tl()
      OR public.is_worker()
    )
  );

-- Users can update their own reports
DROP POLICY IF EXISTS "eod_reports_update" ON public.eod_reports;
CREATE POLICY "eod_reports_update" ON public.eod_reports
  FOR UPDATE TO authenticated
  USING (
    employee_id = auth.uid()
  )
  WITH CHECK (
    employee_id = auth.uid()
  );

-- RLS Policies for eod_report_attachments
DROP POLICY IF EXISTS "eod_attachments_service_all" ON public.eod_report_attachments;
CREATE POLICY "eod_attachments_service_all" ON public.eod_report_attachments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "eod_attachments_select" ON public.eod_report_attachments;
CREATE POLICY "eod_attachments_select" ON public.eod_report_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.eod_reports r
      WHERE r.id = eod_report_attachments.eod_report_id
        AND (r.employee_id = auth.uid() OR public.is_team())
    )
  );

DROP POLICY IF EXISTS "eod_attachments_insert" ON public.eod_report_attachments;
CREATE POLICY "eod_attachments_insert" ON public.eod_report_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eod_reports r
      WHERE r.id = eod_report_attachments.eod_report_id
        AND r.employee_id = auth.uid()
    )
  );

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_eod_reports_employee_date ON public.eod_reports (employee_id, report_date);
CREATE INDEX IF NOT EXISTS idx_eod_reports_date ON public.eod_reports (report_date);
CREATE INDEX IF NOT EXISTS idx_eod_attachments_report ON public.eod_report_attachments (eod_report_id);
