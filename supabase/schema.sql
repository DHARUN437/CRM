-- ============================================================================
-- AgencyOS Client Portal — Database schema
-- Run this file in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================
-- What this creates:
--   1. clients / projects / project_documents / document_requests tables
--   2. RLS policies (clients see only their own data, team sees everything)
--   3. A "client-documents" private storage bucket with access policies
--   4. A trigger that auto-creates a client profile when an admin creates
--      a user with app_metadata.role = 'client'
--
-- User roles live in auth.users.app_metadata.role: 'client' | 'team'.
-- Set them in the dashboard (Authentication → Users → create user) or via
-- the seed script (scripts/seed.mjs).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: is the current user on the team?
--    (reads the role from the JWT — app_metadata is admin-controlled only)
-- ---------------------------------------------------------------------------
create or replace function public.is_team()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'team', false);
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references auth.users(id) on delete cascade,
  name       text not null,
  company    text,
  email      text not null,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'kickoff'
    check (status in ('kickoff', 'in_progress', 'in_review', 'on_hold', 'completed')),
  progress    int  not null default 0 check (progress between 0 and 100),
  tech_stack  text[] not null default '{}',
  start_date  date,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.project_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,
  file_path   text not null,
  file_type   text not null,
  file_size   bigint not null default 0,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.document_requests (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  title               text not null,
  description         text,
  status              text not null default 'pending'
    check (status in ('pending', 'fulfilled')),
  requested_at        timestamptz not null default now(),
  fulfilled_at        timestamptz,
  linked_document_id  uuid references public.project_documents(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- 3. Trigger: auto-create client profile on auth user creation
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_client_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.raw_app_meta_data ->> 'role') = 'client' then
    insert into public.clients (user_id, name, company, email)
    values (
      new.id,
      coalesce(new.raw_app_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      new.raw_app_meta_data ->> 'company',
      new.email
    );
  end if;
  return new;
end;
$$;

-- The trigger function is security definer — it must not be callable directly.
revoke execute on function public.handle_new_client_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_client_user();

-- ---------------------------------------------------------------------------
-- 4. RLS policies
-- ---------------------------------------------------------------------------
alter table public.clients           enable row level security;
alter table public.projects          enable row level security;
alter table public.project_documents enable row level security;
alter table public.document_requests enable row level security;

-- Clients --------------------------------------------------------------
create policy "clients_own_select" on public.clients
  for select to authenticated
  using ( user_id = auth.uid() );

create policy "clients_own_update" on public.clients
  for update to authenticated
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

create policy "team_clients_all" on public.clients
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Projects -------------------------------------------------------------
create policy "clients_projects_select" on public.projects
  for select to authenticated
  using ( client_id in (select id from public.clients where user_id = auth.uid()) );

create policy "team_projects_all" on public.projects
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Project documents ----------------------------------------------------
create policy "clients_docs_select" on public.project_documents
  for select to authenticated
  using ( client_id in (select id from public.clients where user_id = auth.uid()) );

create policy "clients_docs_insert" on public.project_documents
  for insert to authenticated
  with check (
    client_id in (select id from public.clients where user_id = auth.uid())
    and uploaded_by = auth.uid()
  );

create policy "team_docs_all" on public.project_documents
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Document requests ----------------------------------------------------
create policy "clients_requests_select" on public.document_requests
  for select to authenticated
  using ( project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid()
  ));

-- Clients may only fulfill (mark done + link a document) their own requests
create policy "clients_requests_update" on public.document_requests
  for update to authenticated
  using ( project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid()
  ))
  with check (
    project_id in (
      select p.id from public.projects p
      join public.clients c on c.id = p.client_id
      where c.user_id = auth.uid()
    )
  );

create policy "team_requests_all" on public.document_requests
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- ---------------------------------------------------------------------------
-- 5. Storage bucket (private) + policies
--    File path convention: {client_id}/{project_id}/{uuid}-{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

-- Team: full access to the bucket
create policy "team_bucket_all" on storage.objects
  for all to authenticated
  using ( bucket_id = 'client-documents' and public.is_team() )
  with check ( bucket_id = 'client-documents' and public.is_team() );

-- Clients: upload/read only inside their own {client_id}/ folder
create policy "clients_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-documents'
    and (storage.foldername(storage.objects.name))[1] = (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

create policy "clients_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(storage.objects.name))[1] = (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_projects_client    on public.projects (client_id);
create index if not exists idx_docs_project       on public.project_documents (project_id);
create index if not exists idx_docs_client        on public.project_documents (client_id);
create index if not exists idx_requests_project   on public.document_requests (project_id, status);
