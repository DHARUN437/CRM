-- ============================================================================
-- AgencyOS — Enhance document_requests with request_type + text_response
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- Add request_type column (document or info)
alter table public.document_requests
  add column if not exists request_type text not null default 'document'
    check (request_type in ('document', 'info'));

-- Add text_response column for info-type requests
alter table public.document_requests
  add column if not exists text_response text;

-- Add priority column
alter table public.document_requests
  add column if not exists priority text not null default 'normal'
    check (priority in ('normal', 'urgent'));

-- Workers can now insert document requests (for assigned projects)
drop policy if exists "doc_requests_worker_insert" on public.document_requests;
create policy "doc_requests_worker_insert" on public.document_requests
  for insert to authenticated
  with check (
    exists (
      select 1 from public.project_assignments pa
      join public.team_members tm on tm.id = pa.team_member_id
      where pa.project_id = document_requests.project_id
        and tm.user_id = auth.uid()
    )
  );

-- Workers can view requests for their assigned projects
drop policy if exists "doc_requests_worker_select" on public.document_requests;
create policy "doc_requests_worker_select" on public.document_requests
  for select to authenticated
  using (
    public.is_team()
    or exists (
      select 1 from public.project_assignments pa
      join public.team_members tm on tm.id = pa.team_member_id
      where pa.project_id = document_requests.project_id
        and tm.user_id = auth.uid()
    )
    or (
      select client_id from public.projects where id = document_requests.project_id
    ) = (
      select id from public.clients where user_id = auth.uid()
    )
  );
