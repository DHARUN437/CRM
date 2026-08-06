-- ============================================================================
-- AgencyOS — Activity Logs Table & Realtime Setup
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  action      text not null,
  title       text not null,
  details     text,
  created_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.activity_logs enable row level security;

-- RLS policies for activity_logs
-- Uses the SECURITY DEFINER helpers (is_worker_on_project / is_client_of_project)
-- from fix-rls-recursion.sql to avoid RLS recursion with project_assignments.
drop policy if exists "activity_logs_select" on public.activity_logs;
create policy "activity_logs_select" on public.activity_logs
  for select to authenticated
  using (
    public.is_team()
    or ( project_id is not null and public.is_worker_on_project(project_id) )
    or ( project_id is not null and public.is_client_of_project(project_id) )
    or user_id = auth.uid()
  );

-- Only staff can create activity entries (and only for themselves).
-- SECURITY: the old policy let ANY authenticated user (including clients) forge
-- activity entries, which were then broadcast over realtime to the whole team.
drop policy if exists "activity_logs_insert" on public.activity_logs;
create policy "activity_logs_insert" on public.activity_logs
  for insert to authenticated
  with check ( public.is_team() and user_id = auth.uid() );

-- Index
create index if not exists idx_activity_logs_created on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_project on public.activity_logs (project_id);

-- Enable Realtime for activity_logs, project_messages, projects, project_tasks
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.project_messages;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_tasks;
