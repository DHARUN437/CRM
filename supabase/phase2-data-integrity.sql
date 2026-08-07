-- ============================================================================
-- JoyCRM — Phase 2: Data Integrity & Validation
-- ----------------------------------------------------------------------------
-- Run AFTER: phase1-access-control.sql (via npm run db:migrate)
-- ----------------------------------------------------------------------------
-- What this adds:
--   1. Soft-delete columns (deleted_at) on clients + leads.
--   2. RLS filters: soft-deleted rows are invisible to EVERYONE (team, workers,
--      clients). Restoring a row is a deliberate SQL operation.
--   3. Audit on soft-delete:
--        lead.deleted    (leads UPDATE where deleted_at becomes set)
--        client.deleted  (clients UPDATE where deleted_at becomes set)
--      The existing Phase 1 AFTER DELETE triggers remain as a safety net for
--      direct SQL hard deletes.
--
-- NOTE: portal login is revoked at the app layer with GoTrue's soft-delete
-- (admin.auth.admin.deleteUser(id, true) sets auth.users.deleted_at, which
-- blocks sign-in WITHOUT firing the clients.user_id ON DELETE CASCADE, so the
-- soft-deleted clients row survives). No FK change is required here.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Soft-delete columns
-- ---------------------------------------------------------------------------
alter table public.clients add column if not exists deleted_at timestamptz;
alter table public.leads   add column if not exists deleted_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. RLS — hide soft-deleted rows from everyone
--    Command-specific policies: SELECT filters `deleted_at is null`, while
--    UPDATE does NOT — otherwise the soft-delete UPDATE would be rejected,
--    because PostgreSQL applies USING to the NEW row too (once deleted_at is
--    set, that row would fail a USING that requires deleted_at is null).
-- ---------------------------------------------------------------------------

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

drop policy if exists "worker_clients_select" on public.clients;
create policy "worker_clients_select" on public.clients
  for select to authenticated
  using (
    public.is_worker()
    and public.worker_can_read_client(id)
    and deleted_at is null
  );

drop policy if exists "clients_own_select" on public.clients;
create policy "clients_own_select" on public.clients
  for select to authenticated
  using ( user_id = auth.uid() and deleted_at is null );

-- clients never soft-delete themselves, so this keeps a deleted client from
-- editing their row.
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

-- ---------------------------------------------------------------------------
-- 3. Audit on soft-delete (SECURITY DEFINER — cannot be invoked directly)
-- ---------------------------------------------------------------------------

-- 3a. lead.deleted via soft-delete (UPDATE setting deleted_at)
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

-- 3b. client.deleted via soft-delete
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

-- ---------------------------------------------------------------------------
-- 4. Indexes for the common "active rows only" reads
-- ---------------------------------------------------------------------------
create index if not exists idx_leads_active
  on public.leads (id) where deleted_at is null;
create index if not exists idx_clients_active
  on public.clients (id) where deleted_at is null;

-- ============================================================================
-- Verification queries:
--   -- A soft-deleted lead is invisible to team AND the owning worker:
--   update public.leads set deleted_at = now() where id = '<id>';
--   select count(*) from public.leads;  -- deleted row no longer returned
--   -- Audit rows written by the soft-delete:
--   select actor_id, action, entity_type, before, after
--   from public.audit_logs order by created_at desc limit 5;
-- ============================================================================
