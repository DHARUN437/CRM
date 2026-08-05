-- ============================================================================
-- Fix All Supabase RLS Infinite Recursion Issues
-- (clients, projects, feature_requests, document_requests)
-- Run this in your Supabase SQL Editor to permanently fix circular policy errors
-- ============================================================================

-- 1. Clean feature_requests RLS policies
DROP POLICY IF EXISTS "feature_requests_client_insert" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_client_select" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_all" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_select_policy" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_insert_policy" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_update_policy" ON public.feature_requests;

CREATE POLICY "feature_requests_select_policy" ON public.feature_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "feature_requests_insert_policy" ON public.feature_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "feature_requests_update_policy" ON public.feature_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Clean document_requests RLS policies
DROP POLICY IF EXISTS "clients_requests_select" ON public.document_requests;
DROP POLICY IF EXISTS "clients_requests_update" ON public.document_requests;
DROP POLICY IF EXISTS "doc_requests_worker_insert" ON public.document_requests;
DROP POLICY IF EXISTS "doc_requests_worker_select" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_select_policy" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_insert_policy" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_update_policy" ON public.document_requests;

CREATE POLICY "document_requests_select_policy" ON public.document_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "document_requests_insert_policy" ON public.document_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "document_requests_update_policy" ON public.document_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. Clean clients RLS policies
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;
DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
DROP POLICY IF EXISTS "clients_read_own" ON public.clients;
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;

CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_admin_manage_policy" ON public.clients
  FOR ALL TO authenticated USING (public.is_team()) WITH CHECK (public.is_team());

-- 4. Clean projects RLS policies
DROP POLICY IF EXISTS "clients_projects_select" ON public.projects;
DROP POLICY IF EXISTS "worker_projects_select" ON public.projects;
DROP POLICY IF EXISTS "worker_projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;

CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "projects_manage_policy" ON public.projects
  FOR ALL TO authenticated USING (public.is_team()) WITH CHECK (public.is_team());

GRANT ALL ON public.feature_requests TO authenticated, service_role;
GRANT ALL ON public.document_requests TO authenticated, service_role;
GRANT ALL ON public.clients TO authenticated, service_role;
GRANT ALL ON public.projects TO authenticated, service_role;
