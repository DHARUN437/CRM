-- ============================================================================
-- AgencyOS — close the temporary anonymous-access hole
-- Run AFTER schema.sql + roles.sql in: Supabase Dashboard → SQL Editor → Run
--
-- Recommended run order: schema.sql → roles.sql → close-auth.sql → leads.sql
--
-- What this does:
--   1. Drops every "anon_*" policy created by phase-open.sql (open read+write
--      to anon users and the storage bucket).
--   2. Restores NOT NULL on project_documents.uploaded_by (backfilling from the
--      owning client's auth user first).
--   3. Adds the client-facing RLS policies the portal relies on (clients may
--      read their project's assignments + team members).
--   4. Adds project_messages to the realtime publication so chat updates live.
-- ============================================================================

-- 1. Remove anonymous access ------------------------------------------------
drop policy if exists "anon_clients"            on public.clients;
drop policy if exists "anon_projects"           on public.projects;
drop policy if exists "anon_project_documents"  on public.project_documents;
drop policy if exists "anon_document_requests"  on public.document_requests;
drop policy if exists "anon_bucket"             on storage.objects;

-- 2. Restore NOT NULL on uploaded_by ------------------------------------------
--    Uploads recorded while auth was disabled may have NULL uploaded_by; link
--    them to the owning client before tightening the column.
update public.project_documents d
set uploaded_by = c.user_id
from public.clients c
where d.client_id = c.id
  and d.uploaded_by is null;

alter table public.project_documents alter column uploaded_by set not null;

-- 3. Client-facing portal RLS ------------------------------------------------
--    Clients may read assignments for their own projects (feeds "Your team").
drop policy if exists "clients_assignments_select" on public.project_assignments;
create policy "clients_assignments_select" on public.project_assignments
  for select to authenticated
  using ( project_id in (
    select p.id
    from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid()
  ));

--    Clients may read the team members assigned to their projects (feeds the
--    "Your team" card and chat sender names).
drop policy if exists "clients_team_select" on public.team_members;
create policy "clients_team_select" on public.team_members
  for select to authenticated
  using ( exists (
    select 1
    from public.project_assignments pa
    join public.projects p on p.id = pa.project_id
    join public.clients c on c.id = p.client_id
    where pa.team_member_id = public.team_members.id
      and c.user_id = auth.uid()
  ));

-- 4. Realtime for project chat -------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_messages'
  ) then
    alter publication supabase_realtime add table public.project_messages;
  end if;
end $$;
