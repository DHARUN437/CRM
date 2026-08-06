-- ============================================================================
-- JoyCRM — Consolidated Security Fix (RLS + role hardening)
-- ----------------------------------------------------------------------------
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
-- It is idempotent (create or replace / drop policy if exists), safe to re-run.
--
-- What this fixes (matches the delivered audit report):
--   * H1  is_team() silently elevated workers to admin via team_members rows
--   * H2  open/legacy clients policies leaked every client to every user
--   * H3  feature_requests / document_requests open policies (cross-tenant)
--   * H4  projects open policies
--   * H9  notifications WITH CHECK (true) -> any user could write any inbox
--   * H7  client_notes readable/writable by unassigned workers
--   * H8  activity_logs forgeable by clients over realtime
--   * C1  RLS infinite recursion resolved via SECURITY DEFINER helpers
--
-- NOTE: .env.local still holds the SERVICE_ROLE key. Rotate it once you have
-- verified the app works with RLS-scoped sessions only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ROLE HELPERS (JWT-only — the single source of truth is app_metadata.role)
-- ---------------------------------------------------------------------------

-- Worker = app_metadata.role 'worker' (never derived from team_members rows).
CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'worker', false);
$$;

-- Team/staff = app_metadata.role IN ('team','admin','tl').
-- SECURITY: must read the JWT only. The old version also returned true when the
-- user had ANY team_members row — and because handle_new_team_member creates a
-- team_members row for every worker, that silently granted every worker full
-- admin (is_team()) access. app_metadata is admin-controlled, so it is the
-- source of truth.
CREATE OR REPLACE FUNCTION public.is_team()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') IN ('team', 'admin', 'tl'), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_team() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER HELPERS — break the RLS recursion cycle
-- ---------------------------------------------------------------------------

-- Can this worker read a client record?
-- (routes the team_members -> project_assignments -> projects -> clients check
--  through a definer function so RLS policies on those tables cannot recurse)
CREATE OR REPLACE FUNCTION public.worker_can_read_client(c_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.projects p
    JOIN public.project_assignments pa ON pa.project_id = p.id
    JOIN public.team_members tm ON tm.id = pa.team_member_id
    WHERE p.client_id = c_id
      AND tm.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.worker_can_read_client(uuid) TO authenticated;

-- Is the current user a worker assigned to this project?
CREATE OR REPLACE FUNCTION public.is_worker_on_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.project_assignments pa
    JOIN public.team_members tm ON tm.id = pa.team_member_id
    WHERE pa.project_id = p_project_id
      AND tm.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_worker_on_project(uuid) TO authenticated;

-- Does the current user own the client for this project?
CREATE OR REPLACE FUNCTION public.is_client_of_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = p_project_id
      AND c.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_client_of_project(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. clients — scoped, non-recursive policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_select"               ON public.clients;
DROP POLICY IF EXISTS "clients_insert"               ON public.clients;
DROP POLICY IF EXISTS "clients_update"               ON public.clients;
DROP POLICY IF EXISTS "clients_delete"               ON public.clients;
DROP POLICY IF EXISTS "clients_admin_all"            ON public.clients;
DROP POLICY IF EXISTS "clients_read_own"             ON public.clients;
DROP POLICY IF EXISTS "clients_all_policy"           ON public.clients;
DROP POLICY IF EXISTS "clients_select_policy"        ON public.clients;
DROP POLICY IF EXISTS "clients_admin_manage_policy"  ON public.clients;
DROP POLICY IF EXISTS "staff_clients_select"         ON public.clients;
DROP POLICY IF EXISTS "clients_own_select"           ON public.clients;
DROP POLICY IF EXISTS "clients_own_update"           ON public.clients;
DROP POLICY IF EXISTS "clients_self_insert"          ON public.clients;
DROP POLICY IF EXISTS "team_clients_all"             ON public.clients;
DROP POLICY IF EXISTS "worker_clients_select"        ON public.clients;

-- A client sees only their own profile.
CREATE POLICY "clients_own_select" ON public.clients
  FOR SELECT TO authenticated
  USING ( user_id = auth.uid() );

-- A client may update their own profile.
CREATE POLICY "clients_own_update" ON public.clients
  FOR UPDATE TO authenticated
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );

-- Self-registration on first portal login (see repair.sql).
CREATE POLICY "clients_self_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK ( user_id = auth.uid() );

-- Team members (team/admin/tl) can read and manage all clients.
CREATE POLICY "team_clients_all" ON public.clients
  FOR ALL TO authenticated
  USING ( public.is_team() )
  WITH CHECK ( public.is_team() );

-- Assigned workers can read the client behind their projects.
CREATE POLICY "worker_clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING ( public.is_worker() AND public.worker_can_read_client(id) );

-- ---------------------------------------------------------------------------
-- 4. feature_requests — scoped policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "feature_requests_client_insert" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_client_select" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_worker_select"  ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_all"            ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_select_policy"  ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_insert_policy"  ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_update_policy"  ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_team_all"        ON public.feature_requests;

-- Team can read and manage every request.
CREATE POLICY "feature_requests_team_all" ON public.feature_requests
  FOR ALL TO authenticated
  USING ( public.is_team() )
  WITH CHECK ( public.is_team() );

-- A client reads requests on their own projects.
CREATE POLICY "feature_requests_client_select" ON public.feature_requests
  FOR SELECT TO authenticated
  USING ( public.is_client_of_project(project_id) );

-- A client submits a request for their own project (their own client_id).
CREATE POLICY "feature_requests_client_insert" ON public.feature_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_client_of_project(project_id)
    AND client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Assigned workers read requests on their projects (read-only).
CREATE POLICY "feature_requests_worker_select" ON public.feature_requests
  FOR SELECT TO authenticated
  USING ( public.is_worker_on_project(project_id) );

-- ---------------------------------------------------------------------------
-- 5. document_requests — scoped policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_requests_select"     ON public.document_requests;
DROP POLICY IF EXISTS "clients_requests_update"     ON public.document_requests;
DROP POLICY IF EXISTS "doc_requests_worker_insert"  ON public.document_requests;
DROP POLICY IF EXISTS "doc_requests_worker_select"  ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_select_policy" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_insert_policy" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_update_policy" ON public.document_requests;
DROP POLICY IF EXISTS "team_requests_all"                ON public.document_requests;

-- Team can read and manage every request.
CREATE POLICY "team_requests_all" ON public.document_requests
  FOR ALL TO authenticated
  USING ( public.is_team() )
  WITH CHECK ( public.is_team() );

-- A client reads requests on their own projects.
CREATE POLICY "clients_requests_select" ON public.document_requests
  FOR SELECT TO authenticated
  USING ( public.is_client_of_project(project_id) );

-- A client may fulfill (mark done + link a document) their own requests.
CREATE POLICY "clients_requests_update" ON public.document_requests
  FOR UPDATE TO authenticated
  USING ( public.is_client_of_project(project_id) )
  WITH CHECK ( public.is_client_of_project(project_id) );

-- Assigned workers can create requests for their projects.
CREATE POLICY "doc_requests_worker_insert" ON public.document_requests
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_worker_on_project(project_id) );

-- Workers + clients read requests for the projects they can see.
CREATE POLICY "doc_requests_worker_select" ON public.document_requests
  FOR SELECT TO authenticated
  USING (
    public.is_team()
    OR public.is_worker_on_project(project_id)
    OR public.is_client_of_project(project_id)
  );

-- ---------------------------------------------------------------------------
-- 6. projects — scoped policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_projects_select" ON public.projects;
DROP POLICY IF EXISTS "worker_projects_select"   ON public.projects;
DROP POLICY IF EXISTS "worker_projects_update"   ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy"   ON public.projects;
DROP POLICY IF EXISTS "team_projects_all"         ON public.projects;

-- A client reads their own projects.
CREATE POLICY "clients_projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING ( public.is_client_of_project(id) );

-- Assigned workers read their projects.
CREATE POLICY "worker_projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING ( public.is_worker_on_project(id) );

-- Workers may update status/progress of their assigned projects.
CREATE POLICY "worker_projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING ( public.is_worker_on_project(id) )
  WITH CHECK ( public.is_worker_on_project(id) );

-- Team (team/admin/tl) manage projects.
CREATE POLICY "team_projects_all" ON public.projects
  FOR ALL TO authenticated
  USING ( public.is_team() )
  WITH CHECK ( public.is_team() );

-- ---------------------------------------------------------------------------
-- 7. notifications — staff may insert, users manage only their own inbox
-- ---------------------------------------------------------------------------
-- SECURITY: the old version used WITH CHECK (true), letting ANY authenticated
-- user (including clients) write notifications into any user's inbox.
-- Notifications are written by the SECURITY DEFINER triggers in
-- request-notifications.sql (which bypass RLS), so restricting this to staff is
-- safe. "notifications_own_all" (user_id = auth.uid()) already exists; it is
-- recreated defensively below.
DROP POLICY IF EXISTS "notifications_own_all" ON public.notifications;
CREATE POLICY "notifications_own_all" ON public.notifications
  FOR ALL TO authenticated
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );

DROP POLICY IF EXISTS "notifications_team_insert" ON public.notifications;
CREATE POLICY "notifications_team_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_team() );

-- ---------------------------------------------------------------------------
-- 8. client_notes — internal CRM data, staff-only
-- ---------------------------------------------------------------------------
-- SECURITY: the old policy let ANY worker read/write notes about EVERY client.
DROP POLICY IF EXISTS "Team can manage client notes" ON public.client_notes;
CREATE POLICY "Team can manage client notes"
  ON public.client_notes
  FOR ALL
  USING ( public.is_team() )
  WITH CHECK ( public.is_team() );

DROP POLICY IF EXISTS "Service role can manage client notes" ON public.client_notes;
CREATE POLICY "Service role can manage client notes"
  ON public.client_notes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 9. activity_logs — staff-only inserts, scoped reads
-- ---------------------------------------------------------------------------
-- The activity_logs table ships with activity-logs.sql but may not exist yet;
-- create it so this script is fully self-contained.
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,
  title       text NOT NULL,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project  ON public.activity_logs (project_id);

-- SECURITY: the old insert policy let ANY authenticated user (including
-- clients) forge activity entries that were then broadcast over realtime.
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    public.is_team()
    OR ( project_id IS NOT NULL AND public.is_worker_on_project(project_id) )
    OR ( project_id IS NOT NULL AND public.is_client_of_project(project_id) )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_team() AND user_id = auth.uid() );

-- ---------------------------------------------------------------------------
-- 10. Grants (RLS still enforces row-level access)
-- ---------------------------------------------------------------------------
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.feature_requests TO authenticated;
GRANT ALL ON public.document_requests TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.feature_requests TO service_role;
GRANT ALL ON public.document_requests TO service_role;
GRANT ALL ON public.projects TO service_role;

-- ---------------------------------------------------------------------------
-- 11. Verification — run these AFTER the script to confirm the fix
-- ---------------------------------------------------------------------------
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('clients','projects','feature_requests','document_requests',
--                     'notifications','client_notes','activity_logs')
-- ORDER BY tablename, policyname;
--
-- No policy below may show "USING (true)" or "WITH CHECK (true)".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 12. Realtime publication — ensure every table the UI subscribes to is
--     broadcast on the supabase_realtime publication (idempotent).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_logs', 'projects', 'project_tasks', 'project_documents',
    'invoices', 'invoice_payments', 'clients', 'team_members',
    'project_assignments', 'notifications'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
-- ============================================================================
