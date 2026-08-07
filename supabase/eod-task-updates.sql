-- ============================================================================
-- AgencyOS — EOD Task Work Sessions & Work History Migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- 1. eod_task_updates table
CREATE TABLE IF NOT EXISTS public.eod_task_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eod_entry_id    UUID NOT NULL REFERENCES public.eod_reports(id) ON DELETE CASCADE,
  monthly_task_id UUID NOT NULL REFERENCES public.monthly_tasks(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date       DATE NOT NULL DEFAULT current_date,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT eod_task_updates_unique UNIQUE (eod_entry_id, monthly_task_id)
);

-- 2. Row Level Security
ALTER TABLE public.eod_task_updates ENABLE ROW LEVEL SECURITY;

-- Service Role
DROP POLICY IF EXISTS "eod_task_updates_service_all" ON public.eod_task_updates;
CREATE POLICY "eod_task_updates_service_all" ON public.eod_task_updates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Select
DROP POLICY IF EXISTS "eod_task_updates_select" ON public.eod_task_updates;
CREATE POLICY "eod_task_updates_select" ON public.eod_task_updates
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_team()
  );

-- Authenticated Insert
DROP POLICY IF EXISTS "eod_task_updates_insert" ON public.eod_task_updates;
CREATE POLICY "eod_task_updates_insert" ON public.eod_task_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid() OR
    public.is_team()
  );

-- Authenticated Update
DROP POLICY IF EXISTS "eod_task_updates_update" ON public.eod_task_updates;
CREATE POLICY "eod_task_updates_update" ON public.eod_task_updates
  FOR UPDATE TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_team()
  )
  WITH CHECK (
    employee_id = auth.uid() OR
    public.is_team()
  );

-- Authenticated Delete
DROP POLICY IF EXISTS "eod_task_updates_delete" ON public.eod_task_updates;
CREATE POLICY "eod_task_updates_delete" ON public.eod_task_updates
  FOR DELETE TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_team()
  );

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_eod_task_updates_task ON public.eod_task_updates (monthly_task_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_eod_task_updates_entry ON public.eod_task_updates (eod_entry_id);
CREATE INDEX IF NOT EXISTS idx_eod_task_updates_emp ON public.eod_task_updates (employee_id);
