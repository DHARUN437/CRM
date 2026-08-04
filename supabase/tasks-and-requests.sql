-- ============================================================================
-- AgencyOS — Feature requests, project tasks, chat attachments
-- Run AFTER schema.sql + roles.sql + close-auth.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. feature_requests — clients ask the team to build or fix something
-- ---------------------------------------------------------------------------
create table if not exists public.feature_requests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'declined')),
  priority    text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.feature_requests enable row level security;

-- Team can do everything
drop policy if exists "feature_requests_team_all" on public.feature_requests;
create policy "feature_requests_team_all" on public.feature_requests
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Clients can read requests on their own projects
drop policy if exists "feature_requests_client_select" on public.feature_requests;
create policy "feature_requests_client_select" on public.feature_requests
  for select to authenticated
  using ( project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid()
  ));

-- Clients can insert requests on their own projects
drop policy if exists "feature_requests_client_insert" on public.feature_requests;
create policy "feature_requests_client_insert" on public.feature_requests
  for insert to authenticated
  with check (
    client_id in (select id from public.clients where user_id = auth.uid())
    and project_id in (
      select p.id from public.projects p
      join public.clients c on c.id = p.client_id
      where c.user_id = auth.uid()
    )
  );

create index if not exists idx_feature_requests_project on public.feature_requests (project_id, status);
create index if not exists idx_feature_requests_client  on public.feature_requests (client_id);

-- ---------------------------------------------------------------------------
-- 2. project_tasks — to-do items tied to a project
-- ---------------------------------------------------------------------------
create table if not exists public.project_tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'todo'
    check (status in ('todo', 'in_progress', 'review', 'done')),
  priority     text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id  uuid references public.team_members(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null,
  due_date     date,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.project_tasks enable row level security;

-- Team can do everything
drop policy if exists "tasks_team_all" on public.project_tasks;
create policy "tasks_team_all" on public.project_tasks
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Workers can read/update tasks on assigned projects
drop policy if exists "tasks_worker_select" on public.project_tasks;
create policy "tasks_worker_select" on public.project_tasks
  for select to authenticated
  using ( project_id in (
    select pa.project_id from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where tm.user_id = auth.uid()
  ));

drop policy if exists "tasks_worker_update" on public.project_tasks;
create policy "tasks_worker_update" on public.project_tasks
  for update to authenticated
  using ( project_id in (
    select pa.project_id from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where tm.user_id = auth.uid()
  ))
  with check ( project_id in (
    select pa.project_id from public.project_assignments pa
    join public.team_members tm on tm.id = pa.team_member_id
    where tm.user_id = auth.uid()
  ));

-- Clients can read tasks on their own projects
drop policy if exists "tasks_client_select" on public.project_tasks;
create policy "tasks_client_select" on public.project_tasks
  for select to authenticated
  using ( project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid()
  ));

create index if not exists idx_tasks_project  on public.project_tasks (project_id, status);
create index if not exists idx_tasks_assignee on public.project_tasks (assignee_id);

-- ---------------------------------------------------------------------------
-- 3. Chat file attachments — add optional columns to project_messages
-- ---------------------------------------------------------------------------
alter table public.project_messages
  add column if not exists attachment_url  text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;
