-- Fix infinite recursion between clients and team_members

-- The issue is:
-- clients policy "worker_clients_select" queries team_members
-- team_members policy "clients_team_select" calls is_client_team_member(id)
-- is_client_team_member(id) queries clients
-- This causes a cycle.

-- Fix: Make is_client_team_member SECURITY DEFINER so it bypasses RLS on clients
CREATE OR REPLACE FUNCTION public.is_client_team_member(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.project_assignments pa
    join public.projects p on p.id = pa.project_id
    join public.clients c on c.id = p.client_id
    where pa.team_member_id = p_member_id
      and c.user_id = auth.uid()
  );
$$;

-- Also let's extract the inline query from worker_clients_select into a SECURITY DEFINER function
-- just to be absolutely safe and prevent the cycle from the other direction.
CREATE OR REPLACE FUNCTION public.worker_can_read_client(c_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.projects p
    join public.project_assignments pa on pa.project_id = p.id
    join public.team_members tm on tm.id = pa.team_member_id
    where p.client_id = c_id
      and tm.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "worker_clients_select" ON public.clients;
CREATE POLICY "worker_clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    public.is_worker() AND public.worker_can_read_client(id)
  );
