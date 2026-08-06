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
drop policy if exists "activity_logs_select" on public.activity_logs;
create policy "activity_logs_select" on public.activity_logs
  for select to authenticated
  using (
    public.is_team()
    or (
      project_id is not null and exists (
        select 1 from public.project_assignments pa
        join public.team_members tm on tm.id = pa.team_member_id
        where pa.project_id = activity_logs.project_id and tm.user_id = auth.uid()
      )
    )
    or (
      project_id is not null and exists (
        select 1 from public.projects p
        join public.clients c on c.id = p.client_id
        where p.id = activity_logs.project_id and c.user_id = auth.uid()
      )
    )
    or user_id = auth.uid()
  );

drop policy if exists "activity_logs_insert" on public.activity_logs;
create policy "activity_logs_insert" on public.activity_logs
  for insert to authenticated
  with check ( auth.uid() = user_id or public.is_team() );

-- Index
create index if not exists idx_activity_logs_created on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_project on public.activity_logs (project_id);

-- Enable Realtime for activity_logs, project_messages, projects, project_tasks
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.project_messages;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_tasks;
