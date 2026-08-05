-- ============================================================================
-- AgencyOS — Time Tracking & Logged Hours
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  task_id     uuid references public.project_tasks(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  hours       numeric(6, 2) not null check (hours > 0),
  description text,
  logged_at   date not null default current_date,
  created_at  timestamptz not null default now()
);

alter table public.time_entries enable row level security;

-- Team can view and manage all time entries
drop policy if exists "time_entries_team_all" on public.time_entries;
create policy "time_entries_team_all" on public.time_entries
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Workers can insert and read their own time entries
drop policy if exists "time_entries_worker_select" on public.time_entries;
create policy "time_entries_worker_select" on public.time_entries
  for select to authenticated
  using ( user_id = auth.uid() );

drop policy if exists "time_entries_worker_insert" on public.time_entries;
create policy "time_entries_worker_insert" on public.time_entries
  for insert to authenticated
  with check ( user_id = auth.uid() );

create index if not exists idx_time_entries_project on public.time_entries (project_id);
create index if not exists idx_time_entries_task on public.time_entries (task_id);
create index if not exists idx_time_entries_user on public.time_entries (user_id);
