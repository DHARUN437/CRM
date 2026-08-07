-- ============================================================================
-- JoyCRM — Security Audit Fix (Aug 2026)
-- ----------------------------------------------------------------------------
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent (create or replace / drop policy if exists), safe to re-run.
--
-- Fixes the findings from the Aug 2026 codebase audit:
--   * CRITICAL  system_settings RLS had no `TO <role>` -> public (anon) could
--               read/write the Google Drive OAuth refresh token
--   * HIGH      eod_reports INSERT allowed ANY authenticated user (incl clients)
--               to insert report rows that flood the admin EOD feed
--   * MEDIUM    is_staff() was SECURITY DEFINER on "any team_members row";
--               replaced with a JWT-based check (same coverage, no definer)
--
-- PREREQUISITE: run supabase/consolidated-security-fix.sql first if you have
-- not already — it installs the JWT-only is_team()/is_worker() helpers and the
-- SECURITY DEFINER project scoping helpers used below.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Role helpers (JWT-only)
-- ---------------------------------------------------------------------------

-- is_team(): team/admin/tl from app_metadata.role (JWT source of truth).
-- Replaces the original "any team_members row" version that silently granted
-- workers admin access. Matches consolidated-security-fix.sql.
CREATE OR REPLACE FUNCTION public.is_team()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') IN ('team', 'admin', 'tl'), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_team() TO authenticated;

-- is_worker(): worker from app_metadata.role (never from team_members rows).
CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'worker', false);
$$;

GRANT EXECUTE ON FUNCTION public.is_worker() TO authenticated;

-- is_tl(): tl from app_metadata.role only. The legacy version looked up
-- team_members and could recurse under RLS policies.
CREATE OR REPLACE FUNCTION public.is_tl()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') IN ('tl', 'admin', 'team'), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_tl() TO authenticated;

-- is_staff(): any employee role. JWT-based replacement for the SECURITY
-- DEFINER "exists in team_members" version. Same coverage (team/admin/tl/worker),
-- but no definer bypass and no dependency on team_members rows.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') IN ('team', 'admin', 'tl', 'worker'), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. system_settings — fix the CRITICAL public RLS exposure
-- ---------------------------------------------------------------------------

-- The audit found the Google Drive OAuth refresh token stored in the
-- `google_drive_connection` row was readable/writable by ANONYMOUS users.
DROP POLICY IF EXISTS "Allow server access to system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_service_all"     ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_staff_read"      ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_admin_write"     ON public.system_settings;

CREATE POLICY "system_settings_service_all" ON public.system_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "system_settings_staff_read" ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "system_settings_admin_write" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_team())
  WITH CHECK (public.is_team());

-- ---------------------------------------------------------------------------
-- 3. eod_reports — stop clients from inserting report rows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "eod_reports_insert" ON public.eod_reports;
CREATE POLICY "eod_reports_insert" ON public.eod_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    AND (public.is_team() OR public.is_tl() OR public.is_worker())
  );

-- ---------------------------------------------------------------------------
-- 4. Verification — run AFTER this script to confirm the fix
-- ---------------------------------------------------------------------------
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('system_settings','eod_reports')
-- ORDER BY tablename, policyname;
--
-- Expected: NO system_settings policy should list `roles = {public}` or show
-- USING (true) / WITH CHECK (true) without a TO service_role clause.
-- ============================================================================
