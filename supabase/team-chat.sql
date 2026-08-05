-- ============================================================================
-- AgencyOS — internal team chat (admins + workers only; clients excluded)
--
-- Channels:
--   general  — one room every staff member can see and post to
--   project  — internal thread per project, visible to admins + assigned workers
--   dm       — private 1:1 between two staff members
--
-- Senders are always auth.users ids; names/roles resolve via team_members
-- (staff can read the directory through team_members_staff_select).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helpers (SECURITY DEFINER so policies don't recurse through RLS tables)
-- ---------------------------------------------------------------------------

-- Is the current user a staff member (admin or worker)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.user_id = auth.uid()
  )
$$;

-- Can the current user participate in a project's internal channel?
-- (admins everywhere, workers only on assigned projects)
create or replace function public.is_project_staff(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_team()
    or exists (
      select 1
      from public.project_assignments pa
      join public.team_members tm on tm.id = pa.team_member_id
      where pa.project_id = p_project_id
        and tm.user_id = auth.uid()
    )
$$;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_project_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. team_messages
-- ---------------------------------------------------------------------------
create table if not exists public.team_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  channel_type text not null check (channel_type in ('general', 'project', 'dm')),
  project_id   uuid null references public.projects(id) on delete cascade,
  dm_peer_id   uuid null references auth.users(id) on delete cascade,
  body         text not null check (length(trim(body)) > 0),
  created_at   timestamptz not null default now(),
  check (
    (channel_type = 'general' and project_id is null and dm_peer_id is null)
    or (channel_type = 'project' and project_id is not null and dm_peer_id is null)
    or (channel_type = 'dm' and project_id is null and dm_peer_id is not null)
  )
);

alter table public.team_messages enable row level security;

-- Read: staff can read general + project channels they belong to, and any
-- DM they are a participant in.
drop policy if exists "team_messages_select" on public.team_messages;
create policy "team_messages_select" on public.team_messages
  for select to authenticated
  using (
    (channel_type = 'general' and public.is_staff())
    or (channel_type = 'project' and public.is_project_staff(project_id))
    or (channel_type = 'dm' and (sender_id = auth.uid() or dm_peer_id = auth.uid()))
  );

-- Insert: must be staff, sending as yourself, into a channel you belong to.
drop policy if exists "team_messages_insert" on public.team_messages;
create policy "team_messages_insert" on public.team_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_staff()
    and (
      (channel_type = 'general')
      or (
        channel_type = 'project'
        and public.is_project_staff(project_id)
      )
      or (
        channel_type = 'dm'
        and exists (
          select 1 from public.team_members tm
          where tm.user_id = team_messages.dm_peer_id
        )
      )
    )
  );

-- Staff directory: workers may read all team members (name/role) so they can
-- browse project channels + start DMs. Admins already had full access.
drop policy if exists "team_members_staff_select" on public.team_members;
create policy "team_members_staff_select" on public.team_members
  for select to authenticated
  using ( public.is_staff() );

create index if not exists idx_team_messages_channel on public.team_messages (channel_type, created_at);
create index if not exists idx_team_messages_project on public.team_messages (project_id, created_at);
create index if not exists idx_team_messages_dm      on public.team_messages (sender_id, dm_peer_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_messages'
  ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;
end
$$;
