-- Phase 3 — realtime chat
--
-- Run in the Supabase SQL editor after close-auth.sql.
--
--   1. Creates get_sender_info() so the client portal can resolve a sender's
--      name/role for realtime chat messages without extra RLS permissions.
--   2. Ensures project_messages is published for realtime (no-op if already).

-- Resolve a user's display name + role from either the team or clients table.
-- SECURITY DEFINER so any authenticated caller can look up a sender's identity.
create or replace function public.get_sender_info(p_user_id uuid)
returns table (name text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select m.name, m.role
  from public.team_members m
  where m.user_id = p_user_id
  union all
  select coalesce(c.company, c.name), 'client'
  from public.clients c
  where c.user_id = p_user_id
$$;

grant execute on function public.get_sender_info(uuid) to authenticated;

-- Chat must broadcast new messages in real time.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_messages'
  ) then
    alter publication supabase_realtime add table public.project_messages;
  end if;
end
$$;
