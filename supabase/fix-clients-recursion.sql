-- ============================================================================
-- Fix RLS Infinite Recursion for relation "clients"
-- Run this script in your Supabase SQL Editor if you ever see "infinite recursion"
-- ============================================================================

-- 1. Drop existing policies on clients that create circular checks
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;
DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
DROP POLICY IF EXISTS "clients_read_own" ON public.clients;
DROP POLICY IF EXISTS "clients_all_policy" ON public.clients;

-- 2. Create clean, non-recursive policies for clients table
CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "clients_admin_manage_policy" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_team())
  WITH CHECK (public.is_team());

-- 3. Ensure grants
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
