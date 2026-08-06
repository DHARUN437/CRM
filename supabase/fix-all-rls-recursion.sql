-- ============================================================================
-- Fix All Supabase RLS Infinite Recursion Issues — CLOSED, SCOPED VERSION
-- (feature_requests, document_requests, clients, projects)
-- Run this in your Supabase SQL Editor (idempotent, safe to re-run).
--
-- IMPORTANT: the previous version of this script replaced every scoped policy
-- with blanket  USING (true) / WITH CHECK (true)  policies. That permanently
-- fixed the recursion but let ANY authenticated user read/write ALL rows of
-- feature_requests, document_requests, clients and projects — a cross-tenant
-- data leak. This version restores scoped access while keeping the SECURITY
-- DEFINER helpers (is_worker_on_project / is_client_of_project) that break the
-- recursion cycle.
--
-- Depends on public.is_team() (schema.sql / tl-role.sql). If tl-role.sql has
-- run, make sure its is_team() has been replaced with the JWT-only version
-- (see the fix in tl-role.sql).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. SECURITY DEFINER helpers (self-contained so this script works standalone)
-- ---------------------------------------------------------------------------

-- Is the current user a worker assigned to this project?
create or replace function public.is_worker_on_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where pa.project_id = p_project_id
      and tm.user_id = auth.uid()
  )
$$;

-- Does the current user own the client for this project?
create or replace function public.is_client_of_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.clients c on c.id = p.client_id
    where p.id = p_project_id
      and c.user_id = auth.uid()
  )
$$;

grant execute on function public.is_worker_on_project(uuid) to authenticated;
grant execute on function public.is_client_of_project(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. feature_requests — scoped policies
-- ---------------------------------------------------------------------------
drop policy if exists "feature_requests_client_insert" on public.feature_requests;
drop policy if exists "feature_requests_client_select" on public.feature_requests;
drop policy if exists "feature_requests_worker_select" on public.feature_requests;
drop policy if exists "feature_requests_all" on public.feature_requests;
drop policy if exists "feature_requests_select_policy" on public.feature_requests;
drop policy if exists "feature_requests_insert_policy" on public.feature_requests;
drop policy if exists "feature_requests_update_policy" on public.feature_requests;

-- Team can read and manage every request.
drop policy if exists "feature_requests_team_all" on public.feature_requests;
create policy "feature_requests_team_all" on public.feature_requests
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- A client reads requests on their own projects.
create policy "feature_requests_client_select" on public.feature_requests
  for select to authenticated
  using ( public.is_client_of_project(project_id) );

-- A client submits a request for their own project (their own client_id).
create policy "feature_requests_client_insert" on public.feature_requests
  for insert to authenticated
  with check (
    public.is_client_of_project(project_id)
    and client_id in (select id from public.clients where user_id = auth.uid())
  );

-- Assigned workers read requests on their projects (read-only).
create policy "feature_requests_worker_select" on public.feature_requests
  for select to authenticated
  using ( public.is_worker_on_project(project_id) );

-- ---------------------------------------------------------------------------
-- 2. document_requests — scoped policies
-- ---------------------------------------------------------------------------
drop policy if exists "clients_requests_select" on public.document_requests;
drop policy if exists "clients_requests_update" on public.document_requests;
drop policy if exists "doc_requests_worker_insert" on public.document_requests;
drop policy if exists "doc_requests_worker_select" on public.document_requests;
drop policy if exists "document_requests_select_policy" on public.document_requests;
drop policy if exists "document_requests_insert_policy" on public.document_requests;
drop policy if exists "document_requests_update_policy" on public.document_requests;

-- Team can read and manage every request.
drop policy if exists "team_requests_all" on public.document_requests;
create policy "team_requests_all" on public.document_requests
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- A client reads requests on their own projects.
create policy "clients_requests_select" on public.document_requests
  for select to authenticated
  using ( public.is_client_of_project(project_id) );

-- A client may fulfill (mark done + link a document) their own requests.
create policy "clients_requests_update" on public.document_requests
  for update to authenticated
  using ( public.is_client_of_project(project_id) )
  with check ( public.is_client_of_project(project_id) );

-- Assigned workers can create requests for their projects.
create policy "doc_requests_worker_insert" on public.document_requests
  for insert to authenticated
  with check ( public.is_worker_on_project(project_id) );

-- Workers + clients read requests for the projects they can see.
create policy "doc_requests_worker_select" on public.document_requests
  for select to authenticated
  using (
    public.is_team()
    or public.is_worker_on_project(project_id)
    or public.is_client_of_project(project_id)
  );

-- ---------------------------------------------------------------------------
-- 3. clients — drop the open/legacy policies, keep the scoped set
--    (full scoped definitions live in fix-clients-recursion.sql)
-- ---------------------------------------------------------------------------
drop policy if exists "clients_select"             on public.clients;
drop policy if exists "clients_insert"             on public.clients;
drop policy if exists "clients_update"             on public.clients;
drop policy if exists "clients_delete"             on public.clients;
drop policy if exists "clients_admin_all"          on public.clients;
drop policy if exists "clients_read_own"           on public.clients;
drop policy if exists "clients_all_policy"         on public.clients;
drop policy if exists "clients_select_policy"      on public.clients;
drop policy if exists "clients_admin_manage_policy" on public.clients;
drop policy if exists "staff_clients_select"       on public.clients;

-- ---------------------------------------------------------------------------
-- 4. projects — scoped policies
-- ---------------------------------------------------------------------------
drop policy if exists "clients_projects_select" on public.projects;
drop policy if exists "worker_projects_select" on public.projects;
drop policy if exists "worker_projects_update" on public.projects;
drop policy if exists "projects_select_policy" on public.projects;

-- A client reads their own projects.
create policy "clients_projects_select" on public.projects
  for select to authenticated
  using ( public.is_client_of_project(id) );

-- Assigned workers read their projects.
create policy "worker_projects_select" on public.projects
  for select to authenticated
  using ( public.is_worker_on_project(id) );

-- Workers may update status/progress of their assigned projects.
create policy "worker_projects_update" on public.projects
  for update to authenticated
  using ( public.is_worker_on_project(id) )
  with check ( public.is_worker_on_project(id) );

-- Team (team/admin/tl) manage projects (defined here too so this script is
-- self-sufficient; tl_projects_select/update come from tl-role.sql).
drop policy if exists "team_projects_all" on public.projects;
create policy "team_projects_all" on public.projects
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- ---------------------------------------------------------------------------
-- 5. Grants (RLS still enforces row-level access)
-- ---------------------------------------------------------------------------
grant all on public.feature_requests to authenticated;
grant all on public.document_requests to authenticated;
grant all on public.clients to authenticated;
grant all on public.projects to authenticated;
grant all on public.feature_requests to service_role;
grant all on public.document_requests to service_role;
grant all on public.clients to service_role;
grant all on public.projects to service_role;
