-- ============================================================================
-- JoyCRM — Phase 2 fix #2: soft-delete via SECURITY DEFINER RPC
-- ----------------------------------------------------------------------------
-- Run AFTER: phase2-soft-delete-rls-fix.sql (via npm run db:migrate)
-- ----------------------------------------------------------------------------
-- Why this exists:
--   PostgreSQL RLS rejects an UPDATE whose NEW row is not visible to any
--   SELECT policy ("check new row"). Every SELECT policy on clients/leads
--   requires `deleted_at is null`, so `update ... set deleted_at = now()`
--   always fails with `42501 new row violates row-level security policy`.
--   There is no way to express "allow setting deleted_at" in a policy —
--   WITH CHECK only sees the resulting row, which must ALSO pass SELECT.
--
-- Fix: perform the soft-delete inside a SECURITY DEFINER function (owned by
-- postgres, so it bypasses RLS) that checks the caller's role itself:
--   • soft_delete_client(uuid) — team only
--   • soft_delete_lead(uuid)   — team/tl any lead; worker only their own
-- The AFTER UPDATE audit triggers still fire (they read auth.uid(), which is
-- preserved through the definer context) and write lead.deleted/client.deleted.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Cleanup debug artifacts from the RLS investigation
-- ---------------------------------------------------------------------------
drop function if exists public.dbg_test_client(uuid);
drop policy if exists "dbg_all_true" on public.clients;
drop policy if exists "dbg_permissive" on public.clients;

-- ---------------------------------------------------------------------------
-- 1. soft_delete_client(uuid) — admin only
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_client(p_client_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
begin
  if v_role <> 'team' then
    return false;
  end if;
  update public.clients
     set deleted_at = now()
   where id = p_client_id
     and deleted_at is null;
  return found;
end;
$$;

revoke execute on function public.soft_delete_client(uuid) from public, anon;
grant execute on function public.soft_delete_client(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. soft_delete_lead(uuid) — team/tl any lead; worker only their own
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_lead(p_lead_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
begin
  if v_role in ('team', 'tl') then
    update public.leads
       set deleted_at = now()
     where id = p_lead_id
       and deleted_at is null;
  elsif v_role = 'worker' then
    update public.leads
       set deleted_at = now()
     where id = p_lead_id
       and deleted_at is null
       and owner_id in (
         select id from public.team_members where user_id = auth.uid()
       );
  else
    return false;
  end if;
  return found;
end;
$$;

revoke execute on function public.soft_delete_lead(uuid) from public, anon;
grant execute on function public.soft_delete_lead(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Re-create the soft-delete audit triggers (dropped while debugging)
-- ---------------------------------------------------------------------------
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

-- ============================================================================
-- Verification queries:
--   select public.soft_delete_lead('<lead-id>');
--   -- a worker passing another worker's lead id returns false, deleted_at unchanged
--   select action, before, after from public.audit_logs
--   where action in ('lead.deleted', 'client.deleted') order by created_at desc limit 5;
-- ============================================================================
