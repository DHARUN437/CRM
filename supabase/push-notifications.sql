-- ============================================================================
-- AgencyOS — Push Notifications & Device Tokens Table
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

create table if not exists public.user_devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  platform    text not null default 'android',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

-- Enable RLS
alter table public.user_devices enable row level security;

-- Policies
drop policy if exists "user_devices_own_select" on public.user_devices;
create policy "user_devices_own_select" on public.user_devices
  for select to authenticated
  using ( user_id = auth.uid() or public.is_team() );

drop policy if exists "user_devices_own_insert" on public.user_devices;
create policy "user_devices_own_insert" on public.user_devices
  for insert to authenticated
  with check ( user_id = auth.uid() );

drop policy if exists "user_devices_own_update" on public.user_devices;
create policy "user_devices_own_update" on public.user_devices
  for update to authenticated
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

-- Index
create index if not exists idx_user_devices_user on public.user_devices (user_id);
