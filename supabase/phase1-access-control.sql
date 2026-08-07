-- ============================================================================
-- JoyCRM — Phase 1: Access Control & Permissions
-- ----------------------------------------------------------------------------
-- Run AFTER: schema.sql → roles.sql → tl-role.sql → leads.sql (via npm run db:migrate)
-- ----------------------------------------------------------------------------
-- What this adds:
--   1. Row-level permissions on leads:
--        Admin   (team)   → every lead
--        Manager (tl)     → every lead   (manager hierarchy is deferred)
--        SalesRep(worker) → only leads they own (owner_id = their team_members.id)
--        Client           → nothing (unchanged)
--      Enforced in RLS, so Server Components, API routes AND direct browser
--      clients all hit the same gate — a rep cannot fetch another rep's lead.
--   2. audit_logs table + SECURITY DEFINER triggers:
--        lead.stage_changed  (leads UPDATE where stage changes)
--        lead.deleted        (leads DELETE)
--        role.changed        (team_members UPDATE where role changes)
--      Rows are written by the triggers (bypass RLS); authenticated users can
--      only SELECT (admins/tls). Nothing here can be forged from the client.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Row-level permissions on leads
-- ---------------------------------------------------------------------------
drop policy if exists "leads_team_all" on public.leads;
create policy "leads_team_all" on public.leads
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Sales Reps (workers) manage only the leads they own. The WITH CHECK keeps
-- them from reassigning a lead to someone else or forging an owner_id.
-- The subquery reads team_members under RLS, which lets a worker see their
-- own row (team_members_worker_select), so there is no recursion.
drop policy if exists "leads_worker_own" on public.leads;
create policy "leads_worker_own" on public.leads
  for all to authenticated
  using (
    public.is_worker()
    and owner_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  )
  with check (
    public.is_worker()
    and owner_id in (
      select id from public.team_members where user_id = auth.uid()
    )
  );

create index if not exists idx_leads_owner on public.leads (owner_id);

-- ---------------------------------------------------------------------------
-- 2. audit_logs table
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid not null,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- Admins and managers can read the log; no direct insert/update/delete policy
-- exists, so clients can never write audit rows — only the triggers below can.
drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs
  for select to authenticated
  using ( public.is_team() );

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 3. Audit triggers (SECURITY DEFINER — cannot be invoked directly)
-- ---------------------------------------------------------------------------

-- 3a. lead.stage_changed — any UPDATE that moves a lead between stages
create or replace function public.audit_lead_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stage is distinct from new.stage then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(),
      'lead.stage_changed',
      'lead',
      new.id,
      jsonb_build_object('stage', old.stage, 'value', old.value, 'owner_id', old.owner_id),
      jsonb_build_object('stage', new.stage, 'value', new.value, 'owner_id', new.owner_id)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_lead_stage_change() from public, anon, authenticated;

drop trigger if exists trg_audit_lead_stage on public.leads;
create trigger trg_audit_lead_stage
  after update on public.leads
  for each row execute function public.audit_lead_stage_change();

-- 3b. lead.deleted — any DELETE of a lead
create or replace function public.audit_lead_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(),
    'lead.deleted',
    'lead',
    old.id,
    jsonb_build_object(
      'company', old.company,
      'contact', old.contact,
      'value', old.value,
      'stage', old.stage,
      'owner_id', old.owner_id
    ),
    null
  );
  return old;
end;
$$;

revoke execute on function public.audit_lead_delete() from public, anon, authenticated;

drop trigger if exists trg_audit_lead_delete on public.leads;
create trigger trg_audit_lead_delete
  after delete on public.leads
  for each row execute function public.audit_lead_delete();

-- 3c. role.changed — any change to a team member's role
create or replace function public.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (
      auth.uid(),
      'role.changed',
      'team_member',
      new.id,
      jsonb_build_object('role', old.role, 'name', old.name, 'email', old.email),
      jsonb_build_object('role', new.role, 'name', new.name, 'email', new.email)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_role_change() from public, anon, authenticated;

drop trigger if exists trg_audit_role_change on public.team_members;
create trigger trg_audit_role_change
  after update on public.team_members
  for each row execute function public.audit_role_change();

-- ============================================================================
-- Verification queries:
--   -- 1. A worker JWT should return only owner_id = their team_members.id:
--   select id, company, owner_id from public.leads;
--   -- 2. Audit rows after a stage change / delete / role change:
--   select actor_id, action, entity_type, before, after from public.audit_logs order by created_at desc;
--   -- 3. No policy on any of these tables may be USING(true):
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and tablename in ('leads', 'audit_logs');
-- ============================================================================
