-- ============================================================================
-- AgencyOS — Team, worker assignment & project chat
-- Run AFTER schema.sql in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================
-- What this creates:
--   1. team_members      — profile for team ('team' admin) & worker users
--   2. project_assignments — which workers are on which project
--   3. project_messages  — chat threads between clients and the team
--   4. RLS policies      — workers see only their assigned projects, clients
--      only their own, admins see everything
--   5. Storage policy    — workers can read documents of assigned projects
--
-- Roles live in auth.users.app_metadata.role: 'team' | 'worker' | 'client'.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: is the current user a worker?
-- ---------------------------------------------------------------------------
create or replace function public.is_worker()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'worker', false);
$$;

-- ---------------------------------------------------------------------------
-- 2. team_members
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references auth.users(id) on delete cascade,
  role       text not null default 'worker' check (role in ('team', 'worker')),
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_team_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.raw_app_meta_data ->> 'role') in ('team', 'worker') then
    insert into public.team_members (user_id, role, name, email)
    values (
      new.id,
      new.raw_app_meta_data ->> 'role',
      coalesce(new.raw_app_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      new.email
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_team_member() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_team on auth.users;
create trigger on_auth_user_created_team
  after insert on auth.users
  for each row execute function public.handle_new_team_member();

-- ---------------------------------------------------------------------------
-- 3. project_assignments
-- ---------------------------------------------------------------------------
create table if not exists public.project_assignments (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  assigned_at    timestamptz not null default now(),
  unique (project_id, team_member_id)
);

-- ---------------------------------------------------------------------------
-- 4. project_messages (chat threads)
-- ---------------------------------------------------------------------------
create table if not exists public.project_messages (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.team_members         enable row level security;
alter table public.project_assignments  enable row level security;
alter table public.project_messages     enable row level security;

-- Can the current user see a given project? (team = all, worker = assigned,
-- client = owns it)
create or replace function public.can_view_project(project_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_team()
    or exists (
      select 1
      from public.project_assignments pa
      join public.team_members tm on tm.id = pa.team_member_id
      where pa.project_id = can_view_project.project_id
        and tm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = can_view_project.project_id
        and c.user_id = auth.uid()
    );
$$;

-- team_members -------------------------------------------------------------
drop policy if exists "team_members_team_all" on public.team_members;
create policy "team_members_team_all" on public.team_members
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- A worker may read only their own row (to know their name/role)
drop policy if exists "team_members_worker_select" on public.team_members;
create policy "team_members_worker_select" on public.team_members
  for select to authenticated
  using ( user_id = auth.uid() );

-- project_assignments --------------------------------------------------------
drop policy if exists "assignments_team_all" on public.project_assignments;
create policy "assignments_team_all" on public.project_assignments
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- A worker may read their own assignments (and the projects via join)
drop policy if exists "assignments_worker_select" on public.project_assignments;
create policy "assignments_worker_select" on public.project_assignments
  for select to authenticated
  using ( team_member_id in (
    select id from public.team_members where user_id = auth.uid()
  ));

-- project_messages -----------------------------------------------------------
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

-- projects: worker access (admin all + client own already exist) -------------
drop policy if exists "worker_projects_select" on public.projects;
create policy "worker_projects_select" on public.projects
  for select to authenticated
  using ( exists (
    select 1
    from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where pa.project_id = public.projects.id
      and tm.user_id = auth.uid()
  ));

-- Workers may update status/progress of their assigned projects
drop policy if exists "worker_projects_update" on public.projects;
create policy "worker_projects_update" on public.projects
  for update to authenticated
  using ( exists (
    select 1
    from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where pa.project_id = public.projects.id
      and tm.user_id = auth.uid()
  ))
  with check ( exists (
    select 1
    from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where pa.project_id = public.projects.id
      and tm.user_id = auth.uid()
  ));

-- project_documents: worker read access to assigned projects -----------------
drop policy if exists "worker_docs_select" on public.project_documents;
create policy "worker_docs_select" on public.project_documents
  for select to authenticated
  using ( exists (
    select 1
    from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where pa.project_id = public.project_documents.project_id
      and tm.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 6. Storage: workers may download files of assigned projects
--    File path convention: {client_id}/{project_id}/{uuid}-{filename}
-- ---------------------------------------------------------------------------
drop policy if exists "worker_bucket_select" on storage.objects;
create policy "worker_bucket_select" on storage.objects
  for select to authenticated
  using (
    storage.objects.bucket_id = 'client-documents'
    and exists (
      select 1
      from public.projects p
      where p.client_id::text = (storage.foldername(storage.objects.name))[1]
        and exists (
          select 1
          from public.project_assignments pa
          join public.team_members tm on tm.id = pa.team_member_id
          where pa.project_id = p.id
            and tm.user_id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_assignments_project on public.project_assignments (project_id);
create index if not exists idx_assignments_member  on public.project_assignments (team_member_id);
create index if not exists idx_messages_project    on public.project_messages (project_id, created_at);
