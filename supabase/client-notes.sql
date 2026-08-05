-- client_notes: internal notes for CRM users about a client
create table if not exists public.client_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.client_notes enable row level security;

-- Team (admins/workers) can read and write all notes
drop policy if exists "Team can manage client notes" on public.client_notes;
create policy "Team can manage client notes"
  on public.client_notes
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('team', 'worker'), false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('team', 'worker'), false));

-- Service role can manage everything (for API routes)
drop policy if exists "Service role can manage client notes" on public.client_notes;
create policy "Service role can manage client notes"
  on public.client_notes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
