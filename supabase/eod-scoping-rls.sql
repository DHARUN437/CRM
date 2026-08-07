-- ============================================================================
-- AgencyOS — Team Lead EOD Reports Scoping & RLS
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- Helper: Get user_ids of teammates assigned to the same project(s) as the current user
CREATE OR REPLACE FUNCTION public.get_user_teammate_user_ids()
RETURNS TABLE (user_id UUID)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT tm.user_id
  FROM public.team_members tm
  JOIN public.project_assignments pa ON pa.team_member_id = tm.id
  WHERE pa.project_id IN (SELECT project_id FROM public.get_user_assigned_project_ids())
  UNION
  SELECT auth.uid() AS user_id;
$$;

-- ============================================================================
-- RLS on eod_reports
--   - Admin (team): All reports
--   - Team Lead (tl): Own report + reports of workers on their assigned project(s)
--   - Worker (worker): ONLY own report
-- ============================================================================
ALTER TABLE public.eod_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eod_reports_select" ON public.eod_reports;
CREATE POLICY "eod_reports_select" ON public.eod_reports
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_team() OR
    (public.is_tl() AND (employee_id IN (SELECT user_id FROM public.get_user_teammate_user_ids())))
  );

-- ============================================================================
-- RLS on eod_report_attachments
-- ============================================================================
ALTER TABLE public.eod_report_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eod_attachments_select" ON public.eod_report_attachments;
CREATE POLICY "eod_attachments_select" ON public.eod_report_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.eod_reports r
      WHERE r.id = eod_report_attachments.eod_report_id
        AND (
          r.employee_id = auth.uid() OR
          public.is_team() OR
          (public.is_tl() AND (r.employee_id IN (SELECT user_id FROM public.get_user_teammate_user_ids())))
        )
    )
  );
