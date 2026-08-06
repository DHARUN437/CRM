-- ============================================================================
-- Fix RLS Infinite Recursion for relation "clients" + close the open policy
-- Run this script in your Supabase SQL Editor (idempotent, safe to re-run).
--
-- IMPORTANT: the previous version of this script replaced the scoped client
-- policies with a blanket  USING (true)  SELECT policy. That stopped the
-- recursion but exposed EVERY client record to EVERY authenticated user (a
-- cross-tenant leak). This version restores scoped access while keeping the
-- SECURITY DEFINER helpers that break the recursion cycle.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. SECURITY DEFINER helper — can this worker read a client record?
--    (routes the team_members -> project_assignments -> projects -> clients
--    check through a definer function so RLS cannot recurse)
-- ---------------------------------------------------------------------------
create or replace function public.worker_can_read_client(c_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.project_assignments pa on pa.project_id = p.id
    join public.team_members tm on tm.id = pa.team_member_id
    where p.client_id = c_id
      and tm.user_id = auth.uid()
  );
$$;

grant execute on function public.worker_can_read_client(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Drop every existing clients policy (open + legacy recursive variants)
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
-- 2. Scoped, non-recursive policies
-- ---------------------------------------------------------------------------

-- A client sees only their own profile.
drop policy if exists "clients_own_select" on public.clients;
create policy "clients_own_select" on public.clients
  for select to authenticated
  using ( user_id = auth.uid() );

-- A client may update their own profile.
drop policy if exists "clients_own_update" on public.clients;
create policy "clients_own_update" on public.clients
  for update to authenticated
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

-- Self-registration on first portal login (see repair.sql).
drop policy if exists "clients_self_insert" on public.clients;
create policy "clients_self_insert" on public.clients
  for insert to authenticated
  with check ( user_id = auth.uid() );

-- Team members (team/admin/tl) can read and manage all clients.
drop policy if exists "team_clients_all" on public.clients;
create policy "team_clients_all" on public.clients
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Assigned workers can read the client behind their projects.
drop policy if exists "worker_clients_select" on public.clients;
create policy "worker_clients_select" on public.clients
  for select to authenticated
  using ( public.is_worker() and public.worker_can_read_client(id) );

-- ---------------------------------------------------------------------------
-- 3. Grants
-- ---------------------------------------------------------------------------
grant all on public.clients to authenticated;
grant all on public.clients to service_role;
