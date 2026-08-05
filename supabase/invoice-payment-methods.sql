-- ============================================================================
-- AgencyOS — invoice payment methods
--
-- One row per payment received (cash / gpay / netbanking). The invoices table
-- keeps amount_paid as a running total; this table records the history so a
-- single invoice can be paid across multiple methods and each payment keeps
-- its method + timestamp.
-- ============================================================================

create table if not exists public.invoice_payments (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount     numeric(12, 2) not null check (amount > 0),
  method     text not null
    check (method in ('cash', 'gpay', 'netbanking')),
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.invoice_payments enable row level security;

-- Team can do everything
drop policy if exists "invoice_payments_team_all" on public.invoice_payments;
create policy "invoice_payments_team_all" on public.invoice_payments
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

-- Clients can read payments on their own invoices
drop policy if exists "invoice_payments_client_select" on public.invoice_payments;
create policy "invoice_payments_client_select" on public.invoice_payments
  for select to authenticated
  using ( invoice_id in (
    select id from public.invoices
    where client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  ));

create index if not exists idx_invoice_payments_invoice
  on public.invoice_payments (invoice_id);
