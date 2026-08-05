-- ============================================================================
-- AgencyOS — team chat read receipts + notifications
--
-- 1. read_by on team_messages  — uuid[] of users who have read the message
--    (WhatsApp-style delivery state: empty = sent, contains reader = read)
-- 2. team_unread_counts()      — per-channel unread count for the caller
-- 3. team_messages_mark_read() — marks a channel's messages read by the caller
--    and clears the caller's team-chat notifications
-- 4. notify_team_message       — INSERT trigger that notifies recipients
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. read_by column
-- ---------------------------------------------------------------------------
alter table public.team_messages
  add column if not exists read_by uuid[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 2. Per-channel unread counts for the current staff user.
-- SECURITY DEFINER so we can aggregate; visibility is enforced explicitly.
-- ---------------------------------------------------------------------------
create or replace function public.team_unread_counts()
returns table (channel_key text, unread bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when m.channel_type = 'general' then 'general'
      when m.channel_type = 'project' then 'project:' || m.project_id
      else 'dm:' || m.sender_id
    end as channel_key,
    count(*)::bigint as unread
  from public.team_messages m
  where m.sender_id <> auth.uid()
    and not (auth.uid() = any(m.read_by))
    and (
      (m.channel_type = 'general' and public.is_staff())
      or (
        m.channel_type = 'project'
        and public.is_project_staff(m.project_id)
      )
      or (
        m.channel_type = 'dm'
        and (m.sender_id = auth.uid() or m.dm_peer_id = auth.uid())
      )
    )
  group by
    case
      when m.channel_type = 'general' then 'general'
      when m.channel_type = 'project' then 'project:' || m.project_id
      else 'dm:' || m.sender_id
    end
$$;

grant execute on function public.team_unread_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Mark every message in a channel read by the current user, and clear the
-- user's team-chat notifications. Access is re-checked per channel type.
-- ---------------------------------------------------------------------------
create or replace function public.team_messages_mark_read(p_channel_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel_type text;
  v_project_id uuid;
  v_peer_id uuid;
  v_has_access boolean;
  v_count integer;
begin
  if p_channel_key = 'general' then
    v_channel_type := 'general';
  elsif p_channel_key like 'project:%' then
    v_channel_type := 'project';
    v_project_id := substring(p_channel_key from 9)::uuid;
  elsif p_channel_key like 'dm:%' then
    v_channel_type := 'dm';
    v_peer_id := substring(p_channel_key from 4)::uuid;
  else
    return 0;
  end if;

  if v_channel_type = 'general' then
    v_has_access := public.is_staff();
  elsif v_channel_type = 'project' then
    v_has_access := public.is_project_staff(v_project_id);
  else
    v_has_access := public.is_staff()
      and exists (
        select 1 from public.team_messages tm
        where tm.channel_type = 'dm'
          and (
            (tm.sender_id = auth.uid() and tm.dm_peer_id = v_peer_id)
            or (tm.sender_id = v_peer_id and tm.dm_peer_id = auth.uid())
          )
        limit 1
      );
  end if;

  if not v_has_access then
    return 0;
  end if;

  update public.team_messages
  set read_by = array_append(read_by, auth.uid())
  where sender_id <> auth.uid()
    and not (auth.uid() = any(read_by))
    and (
      (v_channel_type = 'general' and channel_type = 'general')
      or (
        v_channel_type = 'project'
        and channel_type = 'project'
        and project_id = v_project_id
      )
      or (
        v_channel_type = 'dm'
        and channel_type = 'dm'
        and (
          (sender_id = auth.uid() and dm_peer_id = v_peer_id)
          or (sender_id = v_peer_id and dm_peer_id = auth.uid())
        )
      )
    );

  get diagnostics v_count = row_count;

  update public.notifications
  set read = true
  where user_id = auth.uid()
    and read = false
    and link like '/chat%';

  return v_count;
end;
$$;

grant execute on function public.team_messages_mark_read(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Notification trigger — notify recipients when a team message is posted.
--    general  → every staff member except the sender
--    project  → admins + workers assigned to the project (except sender)
--    dm       → the peer (guaranteed staff by the insert policy)
-- ===========================================================================
create or replace function public.notify_team_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
  v_body text;
  v_link text;
begin
  select name into v_sender_name from public.team_members where user_id = new.sender_id;
  if v_sender_name is null then
    return new;
  end if;

  v_body := format('%s: %s', v_sender_name, left(new.body, 80));
  v_link := '/chat?channel=' ||
    case
      when new.channel_type = 'general' then 'general'
      when new.channel_type = 'project' then 'project:' || new.project_id
      else 'dm:' || new.dm_peer_id
    end;

  if new.channel_type = 'general' then
    insert into public.notifications (user_id, title, message, link, type)
    select tm.user_id, 'New message', v_body, v_link, 'chat'
    from public.team_members tm
    where tm.user_id <> new.sender_id;
  elsif new.channel_type = 'project' then
    insert into public.notifications (user_id, title, message, link, type)
    select distinct tm.user_id, 'New message', v_body, v_link, 'chat'
    from public.team_members tm
    where tm.user_id <> new.sender_id
      and (
        tm.role = 'team'
        or exists (
          select 1
          from public.project_assignments pa
          join public.team_members t2 on t2.id = pa.team_member_id
          where pa.project_id = new.project_id
            and t2.user_id = tm.user_id
        )
      );
  else
    insert into public.notifications (user_id, title, message, link, type)
    values (new.dm_peer_id, 'New message', v_body, v_link, 'chat');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_team_message on public.team_messages;
create trigger trg_notify_team_message
  after insert on public.team_messages
  for each row execute function public.notify_team_message();
