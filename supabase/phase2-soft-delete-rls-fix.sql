-- ============================================================================
-- JoyCRM — Phase 2 fix: RLS soft-delete UPDATE rejected
-- ----------------------------------------------------------------------------
-- Problem: a single "for all" policy that puts `deleted_at is null` in USING
-- also rejects the soft-delete UPDATE, because PostgreSQL applies USING to the
-- NEW row too — once deleted_at is set, the new row fails the USING clause.
--
-- Fix: split into command-specific policies.
--   • SELECT  → `deleted_at is null` (deleted rows stay invisible)
--   • INSERT / UPDATE / DELETE → no deleted_at filter (soft-delete allowed)
-- ----------------------------------------------------------------------------
-- Run AFTER: phase2-data-integrity.sql (via npm run db:migrate)
-- ============================================================================

-- clients -------------------------------------------------------------------
drop policy if exists "team_clients_all" on public.clients;
drop policy if exists "team_clients_select" on public.clients;
drop policy if exists "team_clients_insert" on public.clients;
drop policy if exists "team_clients_update" on public.clients;
drop policy if exists "team_clients_delete" on public.clients;

create policy "team_clients_select" on public.clients
  for select to authenticated
  using ( public.is_team() and deleted_at is null );

create policy "team_clients_insert" on public.clients
  for insert to authenticated
  with check ( public.is_team() );

create policy "team_clients_update" on public.clients
  for update to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

create policy "team_clients_delete" on public.clients
  for delete to authenticated
  using ( public.is_team() );

-- clients_own_update: keep USING with deleted_at filter (clients never
-- soft-delete themselves), so a deleted client cannot keep editing their row.
drop policy if exists "clients_own_update" on public.clients;
create policy "clients_own_update" on public.clients
  for update to authenticated
  using ( user_id = auth.uid() and deleted_at is null )
  with check ( user_id = auth.uid() );

-- leads ----------------------------------------------------------------------
drop policy if exists "leads_team_all" on public.leads;
drop policy if exists "leads_team_select" on public.leads;
drop policy if exists "leads_team_insert" on public.leads;
drop policy if exists "leads_team_update" on public.leads;
drop policy if exists "leads_team_delete" on public.leads;

create policy "leads_team_select" on public.leads
  for select to authenticated
  using ( public.is_team() and deleted_at is null );

create policy "leads_team_insert" on public.leads
  for insert to authenticated
  with check ( public.is_team() );

create policy "leads_team_update" on public.leads
  for update to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

create policy "leads_team_delete" on public.leads
  for delete to authenticated
  using ( public.is_team() );

-- workers: SELECT filters deleted_at; UPDATE/DELETE do not, so a worker can
-- soft-delete their own active leads and can't touch other workers' rows.
drop policy if exists "leads_worker_own" on public.leads;
drop policy if exists "leads_worker_select" on public.leads;
drop policy if exists "leads_worker_insert" on public.leads;
drop policy if exists "leads_worker_update" on public.leads;
drop policy if exists "leads_worker_delete" on public.leads;

create policy "leads_worker_select" on public.leads
  for select to authenticated
  using (
    public.is_worker()
    and deleted_at is null
    and owner_id in (select id from public.team_members where user_id = auth.uid())
  );

create policy "leads_worker_insert" on public.leads
  for insert to authenticated
  with check (
    public.is_worker()
    and owner_id in (select id from public.team_members where user_id = auth.uid())
  );

create policy "leads_worker_update" on public.leads
  for update to authenticated
  using (
    public.is_worker()
    and owner_id in (select id from public.team_members where user_id = auth.uid())
  )
  with check (
    public.is_worker()
    and owner_id in (select id from public.team_members where user_id = auth.uid())
  );

create policy "leads_worker_delete" on public.leads
  for delete to authenticated
  using (
    public.is_worker()
    and owner_id in (select id from public.team_members where user_id = auth.uid())
  );

-- Re-create the soft-delete audit triggers (removed while debugging) ----------
create or replace function public.audit_lead_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(),
      'lead.deleted',
      'lead',
      new.id,
      jsonb_build_object(
        'company', old.company,
        'contact', old.contact,
        'value', old.value,
        'stage', old.stage,
        'owner_id', old.owner_id
      ),
      jsonb_build_object('deleted_at', new.deleted_at)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_lead_soft_delete() from public, anon, authenticated;

drop trigger if exists trg_audit_lead_soft_delete on public.leads;
create trigger trg_audit_lead_soft_delete
  after update on public.leads
  for each row execute function public.audit_lead_soft_delete();

create or replace function public.audit_client_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(),
      'client.deleted',
      'client',
      new.id,
      jsonb_build_object('name', old.name, 'company', old.company, 'email', old.email),
      jsonb_build_object('deleted_at', new.deleted_at)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_client_soft_delete() from public, anon, authenticated;

drop trigger if exists trg_audit_client_soft_delete on public.clients;
create trigger trg_audit_client_soft_delete
  after update on public.clients
  for each row execute function public.audit_client_soft_delete();
