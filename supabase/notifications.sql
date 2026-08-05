-- ============================================================================
-- AgencyOS — Real-time Notifications
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  message    text not null,
  link       text,
  read       boolean not null default false,
  type       text not null default 'info' check (type in ('info', 'request', 'upload', 'task', 'chat')),
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Users read and update their own notifications
drop policy if exists "notifications_own_all" on public.notifications;
create policy "notifications_own_all" on public.notifications
  for all to authenticated
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

-- Team can insert notifications for any user (e.g. notify clients)
drop policy if exists "notifications_team_insert" on public.notifications;
create policy "notifications_team_insert" on public.notifications
  for insert to authenticated
  with check ( true );

create index if not exists idx_notifications_user_read on public.notifications (user_id, read);
