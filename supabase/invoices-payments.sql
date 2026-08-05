-- ============================================================================
-- AgencyOS — invoice partial payments
--
-- Tracks how much has been paid toward an invoice so the admin can record
-- partial payments. Full payment → status 'paid'; partial → stays 'pending'
-- with the remaining balance shown to admin + client.
-- ============================================================================

alter table public.invoices
  add column if not exists amount_paid numeric(12, 2) not null default 0
  check (amount_paid >= 0);

-- Backfill already-paid invoices so historical rows stay consistent.
update public.invoices
  set amount_paid = total
  where status = 'paid' and amount_paid = 0;
