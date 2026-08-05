-- ============================================================================
-- AgencyOS — Invoices & Billing
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id      uuid not null references public.clients(id) on delete cascade,
  project_id     uuid references public.projects(id) on delete set null,
  amount         numeric(12, 2) not null check (amount >= 0),
  tax            numeric(12, 2) not null default 0 check (tax >= 0),
  total          numeric(12, 2) not null check (total >= 0),
  status         text not null default 'pending'
    check (status in ('draft', 'pending', 'paid', 'overdue')),
  due_date       date not null,
  paid_at        timestamptz,
  notes          text,
  items          jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.invoices enable row level security;

-- Team can do everything
drop policy if exists "invoices_team_all" on public.invoices;
create policy "invoices_team_all" on public.invoices
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Clients can read their own invoices
drop policy if exists "invoices_client_select" on public.invoices;
create policy "invoices_client_select" on public.invoices
  for select to authenticated
  using ( client_id in (
    select id from public.clients where user_id = auth.uid()
  ));

create index if not exists idx_invoices_client on public.invoices (client_id);
create index if not exists idx_invoices_project on public.invoices (project_id);
create index if not exists idx_invoices_status on public.invoices (status);
