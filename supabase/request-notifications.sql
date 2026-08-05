-- ============================================================================
-- AgencyOS — Notifications for document requests & chat messages
-- Run AFTER schema.sql + roles.sql + notifications.sql in the SQL Editor
-- ============================================================================
-- What this does:
--   1. A trigger on document_requests INSERT notifies the owning client.
--   2. A trigger on document_requests UPDATE (fulfilled) notifies the project
--      admins so they know the client responded.
--   3. A trigger on project_messages INSERT notifies the *other* party(s).
--   4. Publishes document_requests for realtime so the portal badge updates
--      live when the team sends a new request.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Realtime for document_requests (portal badge)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'document_requests'
  ) then
    alter publication supabase_realtime add table public.document_requests;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. notify_client_on_request — new request from the team to the client
-- ---------------------------------------------------------------------------
create or replace function public.notify_client_on_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_project_name text;
begin
  select c.user_id, p.name
    into v_user_id, v_project_name
  from public.projects p
  join public.clients c on c.id = p.client_id
  where p.id = new.project_id;

  if v_user_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, title, message, link, type)
  values (
    v_user_id,
    'New request from your team',
    format(
      'Your team needs %s: “%s”%s',
      case when new.request_type = 'info' then 'information' else 'a document' end,
      new.title,
      case when coalesce(new.description, '') <> '' then ' — ' || new.description else '' end
    ),
    '/portal/projects/' || new.project_id,
    'request'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_client_on_request on public.document_requests;
create trigger trg_notify_client_on_request
  after insert on public.document_requests
  for each row execute function public.notify_client_on_request();

-- ---------------------------------------------------------------------------
-- 2. notify_team_on_fulfilled — client responded to a request
-- ---------------------------------------------------------------------------
create or replace function public.notify_team_on_fulfilled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
  v_client_label text;
begin
  if old.status = 'fulfilled' or new.status <> 'fulfilled' then
    return new;
  end if;

  select p.name, coalesce(c.company, c.name)
    into v_project_name, v_client_label
  from public.projects p
  join public.clients c on c.id = p.client_id
  where p.id = new.project_id;

  -- Notify every team member + worker assigned to this project.
  insert into public.notifications (user_id, title, message, link, type)
  select
    tm.user_id,
    'Client responded',
    format('“%s” was marked done by %s on %s.', new.title, v_client_label, v_project_name),
    '/projects/' || new.project_id,
    'request'
  from public.project_assignments pa
  join public.team_members tm on tm.id = pa.team_member_id
  where pa.project_id = new.project_id;

  -- Also notify admins who may not be assigned.
  insert into public.notifications (user_id, title, message, link, type)
  select
    tm.user_id,
    'Client responded',
    format('“%s” was marked done by %s on %s.', new.title, v_client_label, v_project_name),
    '/projects/' || new.project_id,
    'request'
  from public.team_members tm
  where tm.role = 'team'
    and tm.user_id not in (
      select tm2.user_id
      from public.project_assignments pa2
      join public.team_members tm2 on tm2.id = pa2.team_member_id
      where pa2.project_id = new.project_id
    );

  return new;
end;
$$;

drop trigger if exists trg_notify_team_on_fulfilled on public.document_requests;
create trigger trg_notify_team_on_fulfilled
  after update on public.document_requests
  for each row execute function public.notify_team_on_fulfilled();

-- ---------------------------------------------------------------------------
-- 3. notify_on_chat_message — tell the *other* side a new message arrived
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
  v_project_name text;
  v_client_user uuid;
  v_team_user uuid;
begin
  select coalesce(c.company, c.name)
    into v_sender_name
  from public.clients c
  where c.user_id = new.sender_id;

  if v_sender_name is null then
    select name into v_sender_name
    from public.team_members
    where user_id = new.sender_id;
  end if;

  if v_sender_name is null then
    return new;
  end if;

  select p.name into v_project_name
  from public.projects p
  where p.id = new.project_id;

  select c.user_id into v_client_user
  from public.projects p
  join public.clients c on c.id = p.client_id
  where p.id = new.project_id;

  -- If the sender is a client, notify all assigned team members + admins.
  if v_client_user is not null and new.sender_id = v_client_user then
    insert into public.notifications (user_id, title, message, link, type)
    select distinct
      tm.user_id,
      'New message',
      format('%s sent a message on %s.', v_sender_name, v_project_name),
      '/projects/' || new.project_id,
      'chat'
    from public.team_members tm
    where tm.user_id <> new.sender_id
      and (
        tm.role = 'team'
        or exists (
          select 1 from public.project_assignments pa
          join public.team_members t2 on t2.id = pa.team_member_id
          where pa.project_id = new.project_id
            and t2.user_id = tm.user_id
        )
      );
  end if;

  -- If the sender is team/worker, notify the client.
  if v_client_user is not null and new.sender_id <> v_client_user then
    insert into public.notifications (user_id, title, message, link, type)
    values (
      v_client_user,
      'New message',
      format('%s sent a message on %s.', v_sender_name, v_project_name),
      '/portal/projects/' || new.project_id,
      'chat'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_chat_message on public.project_messages;
create trigger trg_notify_on_chat_message
  after insert on public.project_messages
  for each row execute function public.notify_on_chat_message();
