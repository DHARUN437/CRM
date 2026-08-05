-- ============================================================================
-- AgencyOS — Team Lead (TL) role
-- Run AFTER roles.sql in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================
-- What this creates:
--   1. Extends team_members.role to accept 'tl'
--   2. Adds budget + tl_id columns to projects
--   3. Updates the handle_new_team_member trigger for 'tl' role
--   4. Updates is_staff() / is_project_staff() to include TL
--   5. RLS: TL can assign/remove workers from their projects
--   6. RLS: budget is only visible to admins and the project's TL
--   7. Indexes
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend team_members.role to accept 'tl'
-- ---------------------------------------------------------------------------
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_check
    CHECK (role IN ('team', 'worker', 'tl'));

-- ---------------------------------------------------------------------------
-- 2. Add budget + tl_id columns to projects
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget   numeric(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tl_id    uuid          DEFAULT NULL
    REFERENCES public.team_members(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 3. Update handle_new_team_member trigger to accept 'tl'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_team_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (new.raw_app_meta_data ->> 'role') IN ('team', 'worker', 'tl') THEN
    INSERT INTO public.team_members (user_id, role, name, email)
    VALUES (
      new.id,
      new.raw_app_meta_data ->> 'role',
      COALESCE(new.raw_app_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      new.email
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4a. is_tl() helper — is the current user a Team Lead?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tl()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'tl', false);
$$;

-- ---------------------------------------------------------------------------
-- 4b. is_tl_of_project(project_id) — is the current user the TL of a project?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tl_of_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.team_members tm ON tm.id = p.tl_id
    WHERE p.id = p_project_id
      AND tm.user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_tl() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tl_of_project(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4c. Update is_staff() — TLs are staff
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- 4d. Update is_project_staff() — TLs count as project staff for their project
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_project_staff(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_team()
    OR public.is_tl_of_project(p_project_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_assignments pa
      JOIN public.team_members tm ON tm.id = pa.team_member_id
      WHERE pa.project_id = p_project_id
        AND tm.user_id = auth.uid()
    )
$$;

-- ---------------------------------------------------------------------------
-- 5a. Projects: Admin team members can do all actions on projects
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_projects_all" ON public.projects;
CREATE POLICY "team_projects_all" ON public.projects
  FOR ALL TO authenticated
  USING ( public.is_team() )
  WITH CHECK ( public.is_team() );

-- ---------------------------------------------------------------------------
-- 5a2. Projects: TL can view their own project (as TL)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tl_projects_select" ON public.projects;
CREATE POLICY "tl_projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING ( public.is_tl_of_project(id) );

-- ---------------------------------------------------------------------------
-- 5b. Projects: TL can update their own project (status/progress only — not budget/tl_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tl_projects_update" ON public.projects;
CREATE POLICY "tl_projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING ( public.is_tl_of_project(id) )
  WITH CHECK ( public.is_tl_of_project(id) );

-- ---------------------------------------------------------------------------
-- 5c. project_assignments: TL can insert/delete workers for their project
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tl_assignments_insert" ON public.project_assignments;
CREATE POLICY "tl_assignments_insert" ON public.project_assignments
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_tl_of_project(project_id) );

DROP POLICY IF EXISTS "tl_assignments_delete" ON public.project_assignments;
CREATE POLICY "tl_assignments_delete" ON public.project_assignments
  FOR DELETE TO authenticated
  USING ( public.is_tl_of_project(project_id) );

-- ---------------------------------------------------------------------------
-- 5d. team_members: TL can read all team members (to assign workers)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tl_team_members_select" ON public.team_members;
CREATE POLICY "tl_team_members_select" ON public.team_members
  FOR SELECT TO authenticated
  USING ( public.is_tl() );

-- ---------------------------------------------------------------------------
-- 5e. project_documents: TL can read documents from their project
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tl_docs_select" ON public.project_documents;
CREATE POLICY "tl_docs_select" ON public.project_documents
  FOR SELECT TO authenticated
  USING ( public.is_tl_of_project(project_id) );

-- ---------------------------------------------------------------------------
-- 5f. Storage: TL can download files for their project
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tl_bucket_select" ON storage.objects;
CREATE POLICY "tl_bucket_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    storage.objects.bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.client_id::text = (storage.foldername(storage.objects.name))[1]
        AND public.is_tl_of_project(p.id)
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Secure view: project budget (admins + TL of the project only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.project_budgets_view
WITH (security_invoker = true)
AS
  SELECT
    p.id            AS project_id,
    p.budget,
    p.tl_id
  FROM public.projects p
  WHERE
    public.is_team()
    OR public.is_tl_of_project(p.id);

GRANT SELECT ON public.project_budgets_view TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_tl ON public.projects (tl_id);

-- ---------------------------------------------------------------------------
-- 8. Allow staff (team + TLs) to view and manage client details
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_team()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') IN ('team', 'admin', 'tl'), false)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
    );
$$;

DROP POLICY IF EXISTS "staff_clients_select" ON public.clients;
DROP POLICY IF EXISTS "team_clients_all" ON public.clients;

CREATE POLICY "team_clients_all" ON public.clients
  FOR ALL TO authenticated
  USING ( public.is_team() )
  WITH CHECK ( public.is_team() );
