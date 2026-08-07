-- ============================================================================
-- AgencyOS — Project-Scoped Access Control & Detail Level Permissions (RLS)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- Helper: Check if current user is Team Lead
CREATE OR REPLACE FUNCTION public.is_tl()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'tl', FALSE) OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid() AND role = 'tl'
  );
$$;

-- Helper: Get assigned project IDs for the current user (TL or Worker)
CREATE OR REPLACE FUNCTION public.get_user_assigned_project_ids()
RETURNS TABLE (project_id UUID)
LANGUAGE sql
STABLE
AS $$
  SELECT pa.project_id
  FROM public.project_assignments pa
  JOIN public.team_members tm ON tm.id = pa.team_member_id
  WHERE tm.user_id = auth.uid()
  UNION
  SELECT p.id AS project_id
  FROM public.projects p
  JOIN public.team_members tm ON tm.id = p.tl_id
  WHERE tm.user_id = auth.uid();
$$;

-- ============================================================================
-- 1. RLS on meetings
--    - Admin (team): All meetings
--    - Team Lead (tl): Meetings for assigned projects
--    - Worker (worker): BLOCKED at RLS level
-- ============================================================================
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetings_select" ON public.meetings;
CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT TO authenticated
  USING (
    public.is_team() OR
    (public.is_tl() AND (project_id IN (SELECT project_id FROM public.get_user_assigned_project_ids()))) OR
    (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "meetings_update" ON public.meetings;
CREATE POLICY "meetings_update" ON public.meetings
  FOR UPDATE TO authenticated
  USING (
    public.is_team() OR
    (public.is_tl() AND (project_id IN (SELECT project_id FROM public.get_user_assigned_project_ids())))
  )
  WITH CHECK (
    public.is_team() OR
    (public.is_tl() AND (project_id IN (SELECT project_id FROM public.get_user_assigned_project_ids())))
  );

-- ============================================================================
-- 2. RLS on document_requests & feature_requests
--    - Worker (worker): BLOCKED at RLS level
-- ============================================================================
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_requests_select" ON public.document_requests;
CREATE POLICY "doc_requests_select" ON public.document_requests
  FOR SELECT TO authenticated
  USING (
    public.is_team() OR
    (public.is_tl() AND (project_id IN (SELECT project_id FROM public.get_user_assigned_project_ids()))) OR
    (project_id IN (SELECT id FROM public.projects WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())))
  );

DROP POLICY IF EXISTS "feature_requests_select" ON public.feature_requests;
CREATE POLICY "feature_requests_select" ON public.feature_requests
  FOR SELECT TO authenticated
  USING (
    public.is_team() OR
    (public.is_tl() AND (project_id IN (SELECT project_id FROM public.get_user_assigned_project_ids()))) OR
    (project_id IN (SELECT id FROM public.projects WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())))
  );

-- ============================================================================
-- 3. RLS on projects
--    - Admin: All
--    - TL & Worker: ONLY assigned projects
-- ============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_scoped" ON public.projects;
CREATE POLICY "projects_select_scoped" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.is_team() OR
    (id IN (SELECT project_id FROM public.get_user_assigned_project_ids())) OR
    (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  );

-- ============================================================================
-- 4. RLS on project_documents
--    - Admin: All
--    - TL & Worker: ONLY documents of assigned projects
-- ============================================================================
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_docs_select_scoped" ON public.project_documents;
CREATE POLICY "project_docs_select_scoped" ON public.project_documents
  FOR SELECT TO authenticated
  USING (
    public.is_team() OR
    (project_id IN (SELECT project_id FROM public.get_user_assigned_project_ids())) OR
    (project_id IN (SELECT id FROM public.projects WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())))
  );
