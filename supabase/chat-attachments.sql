-- ============================================================================
-- AgencyOS — Chat attachments storage bucket
-- Run AFTER roles.sql + close-auth.sql in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Create the private bucket ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

-- 2. Team/admin: full access --------------------------------------------------
drop policy if exists "chat_team_all" on storage.objects;
create policy "chat_team_all" on storage.objects
  for all to authenticated
  using ( bucket_id = 'chat-attachments' and public.is_team() )
  with check ( bucket_id = 'chat-attachments' and public.is_team() );

-- 3. Workers: read/write for assigned projects --------------------------------
drop policy if exists "chat_worker_select" on storage.objects;
create policy "chat_worker_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[1]
        and exists (
          select 1
          from public.project_assignments pa
          join public.team_members tm on tm.id = pa.team_member_id
          where pa.project_id = p.id
            and tm.user_id = auth.uid()
        )
    )
  );

drop policy if exists "chat_worker_insert" on storage.objects;
create policy "chat_worker_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(storage.objects.name))[1]
        and exists (
          select 1
          from public.project_assignments pa
          join public.team_members tm on tm.id = pa.team_member_id
          where pa.project_id = p.id
            and tm.user_id = auth.uid()
        )
    )
  );

-- 4. Clients: read/write for their own projects ------------------------------
drop policy if exists "chat_client_select" on storage.objects;
create policy "chat_client_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id::text = (storage.foldername(storage.objects.name))[1]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "chat_client_insert" on storage.objects;
create policy "chat_client_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id::text = (storage.foldername(storage.objects.name))[1]
        and c.user_id = auth.uid()
    )
  );
