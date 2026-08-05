-- ============================================================================
-- AgencyOS — fix RLS infinite recursion between projects / project_assignments
--
-- Problem: policies that inline subqueries against project_assignments (or
-- projects joined to clients) create circular references:
--
--   projects.worker_projects_select        -> project_assignments
--     -> project_assignments.clients_assignments_select -> projects
--       -> projects.worker_projects_select -> ... infinite recursion
--
-- Postgres aborts these with "infinite recursion detected in policy for
-- relation ...". As a result, assigned WORKERS and portal CLIENTS get errors
-- on nearly every query (admins are unaffected because their policies only
-- call is_team()).
--
-- Fix: route every cross-table access check through SECURITY DEFINER helper
-- functions. Inside a security definer function the tables it reads are not
-- subject to RLS again, so the cycle is broken.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Security-definer helpers
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

-- Is this team member assigned to any project belonging to the current client?
create or replace function public.is_client_team_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments pa
    join public.projects p on p.id = pa.project_id
    join public.clients c on c.id = p.client_id
    where pa.team_member_id = p_member_id
      and c.user_id = auth.uid()
  )
$$;

-- Re-create can_view_project with SECURITY DEFINER so chat policies don't
-- recurse through project_assignments / projects. CASCADE drops the old
-- messages_select/messages_insert policies that referenced it; they are
-- recreated below.
drop function if exists public.can_view_project(uuid) cascade;
create function public.can_view_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_team()
    or public.is_worker_on_project(p_project_id)
    or public.is_client_of_project(p_project_id)
$$;

-- Storage folder access. client-documents uses {client_id}/ folders,
-- chat-attachments uses {project_id}/ folders.
create or replace function public.storage_folder_allowed(p_bucket text, p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_bucket = 'client-documents' then
      public.is_team()
      or exists (
        select 1 from public.clients c
        where c.id::text = p_folder and c.user_id = auth.uid()
      )
      or exists (
        select 1 from public.projects p
        join public.project_assignments pa on pa.project_id = p.id
        join public.team_members tm on tm.id = pa.team_member_id
        where p.client_id::text = p_folder
          and tm.user_id = auth.uid()
      )
    when p_bucket = 'chat-attachments' then
      public.is_team()
      or exists (
        select 1 from public.projects p
        where p.id::text = p_folder
          and (
            exists (
              select 1 from public.project_assignments pa
              join public.team_members tm on tm.id = pa.team_member_id
              where pa.project_id = p.id and tm.user_id = auth.uid()
            )
            or exists (
              select 1 from public.clients c
              where c.id = p.client_id and c.user_id = auth.uid()
            )
          )
      )
    else false
  end
$$;

grant execute on function public.is_worker_on_project(uuid) to authenticated;
grant execute on function public.is_client_of_project(uuid) to authenticated;
grant execute on function public.is_client_team_member(uuid) to authenticated;
grant execute on function public.can_view_project(uuid) to authenticated;
grant execute on function public.storage_folder_allowed(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Rewrite every policy that cross-references another RLS table
-- ---------------------------------------------------------------------------

-- projects ------------------------------------------------------------------
drop policy if exists "clients_projects_select" on public.projects;
create policy "clients_projects_select" on public.projects
  for select to authenticated
  using ( public.is_client_of_project(id) );

drop policy if exists "worker_projects_select" on public.projects;
create policy "worker_projects_select" on public.projects
  for select to authenticated
  using ( public.is_worker_on_project(id) );

drop policy if exists "worker_projects_update" on public.projects;
create policy "worker_projects_update" on public.projects
  for update to authenticated
  using ( public.is_worker_on_project(id) )
  with check ( public.is_worker_on_project(id) );

-- project_assignments ---------------------------------------------------------
drop policy if exists "assignments_worker_select" on public.project_assignments;
create policy "assignments_worker_select" on public.project_assignments
  for select to authenticated
  using ( public.is_worker_on_project(project_id) );

drop policy if exists "clients_assignments_select" on public.project_assignments;
create policy "clients_assignments_select" on public.project_assignments
  for select to authenticated
  using ( public.is_client_of_project(project_id) );

-- team_members ----------------------------------------------------------------
drop policy if exists "clients_team_select" on public.team_members;
create policy "clients_team_select" on public.team_members
  for select to authenticated
  using ( public.is_client_team_member(id) );

-- project_messages -------------------------------------------------------------
drop policy if exists "messages_select" on public.project_messages;
create policy "messages_select" on public.project_messages
  for select to authenticated
  using ( public.can_view_project(project_id) );

drop policy if exists "messages_insert" on public.project_messages;
create policy "messages_insert" on public.project_messages
  for insert to authenticated
  with check (
    public.can_view_project(project_id)
    and sender_id = auth.uid()
  );

-- project_documents -------------------------------------------------------------
drop policy if exists "worker_docs_select" on public.project_documents;
create policy "worker_docs_select" on public.project_documents
  for select to authenticated
  using ( public.is_worker_on_project(project_id) );

-- document_requests --------------------------------------------------------------
drop policy if exists "clients_requests_select" on public.document_requests;
create policy "clients_requests_select" on public.document_requests
  for select to authenticated
  using ( public.is_client_of_project(project_id) );

drop policy if exists "clients_requests_update" on public.document_requests;
create policy "clients_requests_update" on public.document_requests
  for update to authenticated
  using ( public.is_client_of_project(project_id) )
  with check ( public.is_client_of_project(project_id) );

drop policy if exists "doc_requests_worker_insert" on public.document_requests;
create policy "doc_requests_worker_insert" on public.document_requests
  for insert to authenticated
  with check ( public.is_worker_on_project(project_id) );

drop policy if exists "doc_requests_worker_select" on public.document_requests;
create policy "doc_requests_worker_select" on public.document_requests
  for select to authenticated
  using (
    public.is_team()
    or public.is_worker_on_project(project_id)
    or public.is_client_of_project(project_id)
  );

-- feature_requests ----------------------------------------------------------------
drop policy if exists "feature_requests_client_select" on public.feature_requests;
create policy "feature_requests_client_select" on public.feature_requests
  for select to authenticated
  using ( public.is_client_of_project(project_id) );

drop policy if exists "feature_requests_client_insert" on public.feature_requests;
create policy "feature_requests_client_insert" on public.feature_requests
  for insert to authenticated
  with check (
    public.is_client_of_project(project_id)
    and client_id in (select id from public.clients where user_id = auth.uid())
  );

-- project_tasks ---------------------------------------------------------------------
drop policy if exists "tasks_worker_select" on public.project_tasks;
create policy "tasks_worker_select" on public.project_tasks
  for select to authenticated
  using ( public.is_worker_on_project(project_id) );

drop policy if exists "tasks_worker_update" on public.project_tasks;
create policy "tasks_worker_update" on public.project_tasks
  for update to authenticated
  using ( public.is_worker_on_project(project_id) )
  with check ( public.is_worker_on_project(project_id) );

drop policy if exists "tasks_client_select" on public.project_tasks;
create policy "tasks_client_select" on public.project_tasks
  for select to authenticated
  using ( public.is_client_of_project(project_id) );

-- storage.objects ---------------------------------------------------------------
drop policy if exists "worker_bucket_select" on storage.objects;
create policy "worker_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-documents'
    and public.storage_folder_allowed(bucket_id, (storage.foldername(storage.objects.name))[1])
  );

drop policy if exists "chat_worker_select" on storage.objects;
create policy "chat_worker_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.storage_folder_allowed(bucket_id, (storage.foldername(storage.objects.name))[1])
  );

drop policy if exists "chat_worker_insert" on storage.objects;
create policy "chat_worker_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.storage_folder_allowed(bucket_id, (storage.foldername(storage.objects.name))[1])
  );

drop policy if exists "chat_client_select" on storage.objects;
create policy "chat_client_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.storage_folder_allowed(bucket_id, (storage.foldername(storage.objects.name))[1])
  );

drop policy if exists "chat_client_insert" on storage.objects;
create policy "chat_client_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.storage_folder_allowed(bucket_id, (storage.foldername(storage.objects.name))[1])
  );
