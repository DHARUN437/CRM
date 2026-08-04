-- ============================================================================
-- AgencyOS Client Portal — repair script (run if the trigger and/or storage
-- bucket were not created when schema.sql ran)
-- Safe to run multiple times. Run in: SQL Editor → Run
-- ============================================================================

-- 1. Ensure the storage bucket exists ----------------------------------------
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

-- 2. Ensure the client-profile trigger exists ---------------------------------
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_client_user();

-- 3. Allow clients to self-create their profile on first portal login ---------
create policy "clients_self_insert" on public.clients
  for insert to authenticated
  with check ( user_id = auth.uid() );

-- 3b. Storage access policies (may be missing if schema section 5 never ran) --
drop policy if exists "team_bucket_all" on storage.objects;
drop policy if exists "clients_bucket_insert" on storage.objects;
drop policy if exists "clients_bucket_select" on storage.objects;

create policy "team_bucket_all" on storage.objects
  for all to authenticated
  using ( bucket_id = 'client-documents' and public.is_team() )
  with check ( bucket_id = 'client-documents' and public.is_team() );

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

-- 4. Verify (should return 1 row for the bucket, 1 row for the trigger) -------
select 'bucket' as check_name, id as value from storage.buckets where id = 'client-documents'
union all
select 'trigger' as check_name, tgname as value from pg_trigger where tgname = 'on_auth_user_created';
