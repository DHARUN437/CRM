-- ============================================================================
-- AgencyOS — feature_requests visibility for workers + live updates
--
-- Problems fixed:
--   1. Assigned workers had NO policy on feature_requests, so RLS silently
--      returned zero rows for them (only team + client could read). Workers
--      now read requests on projects they're assigned to (read-only; status
--      changes remain an admin action).
--   2. feature_requests was not in the realtime publication, so the admin /
--      worker project page never received an event when a client submitted a
--      new request. It's now published, and the app subscribes to it.
-- ============================================================================

-- Workers can read feature requests on projects they're assigned to.
-- Uses the SECURITY DEFINER helper from fix-rls-recursion.sql to avoid RLS
-- recursion with project_assignments.
drop policy if exists "feature_requests_worker_select" on public.feature_requests;
create policy "feature_requests_worker_select" on public.feature_requests
  for select to authenticated
  using ( public.is_worker_on_project(project_id) );

-- Publish feature_requests for realtime so the team app updates live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'feature_requests'
  ) then
    alter publication supabase_realtime add table public.feature_requests;
  end if;
end
$$;
