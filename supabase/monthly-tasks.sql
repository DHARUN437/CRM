-- ============================================================================
-- AgencyOS — Monthly Tasks & EOD Task Linking Migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- 1. monthly_tasks table
CREATE TABLE IF NOT EXISTS public.monthly_tasks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT,
  month                TEXT NOT NULL, -- e.g. "2026-08"
  due_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at         TIMESTAMPTZ,
  completed_via_eod_id UUID REFERENCES public.eod_reports(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. eod_report_tasks join table
CREATE TABLE IF NOT EXISTS public.eod_report_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eod_report_id    UUID NOT NULL REFERENCES public.eod_reports(id) ON DELETE CASCADE,
  task_id          UUID NOT NULL REFERENCES public.monthly_tasks(id) ON DELETE CASCADE,
  marked_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT eod_report_tasks_unique UNIQUE (eod_report_id, task_id)
);

-- 3. Row Level Security
ALTER TABLE public.monthly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_report_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_tasks
DROP POLICY IF EXISTS "monthly_tasks_service_all" ON public.monthly_tasks;
CREATE POLICY "monthly_tasks_service_all" ON public.monthly_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "monthly_tasks_select" ON public.monthly_tasks;
CREATE POLICY "monthly_tasks_select" ON public.monthly_tasks
  FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    public.is_team()
  );

DROP POLICY IF EXISTS "monthly_tasks_insert" ON public.monthly_tasks;
CREATE POLICY "monthly_tasks_insert" ON public.monthly_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team()
  );

DROP POLICY IF EXISTS "monthly_tasks_update" ON public.monthly_tasks;
CREATE POLICY "monthly_tasks_update" ON public.monthly_tasks
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    public.is_team()
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    public.is_team()
  );

-- RLS Policies for eod_report_tasks
DROP POLICY IF EXISTS "eod_tasks_service_all" ON public.eod_report_tasks;
CREATE POLICY "eod_tasks_service_all" ON public.eod_report_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "eod_tasks_select" ON public.eod_report_tasks;
CREATE POLICY "eod_tasks_select" ON public.eod_report_tasks
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "eod_tasks_insert" ON public.eod_report_tasks;
CREATE POLICY "eod_tasks_insert" ON public.eod_report_tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_assigned ON public.monthly_tasks (assigned_to, month);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_status ON public.monthly_tasks (status);
CREATE INDEX IF NOT EXISTS idx_eod_tasks_report ON public.eod_report_tasks (eod_report_id);
CREATE INDEX IF NOT EXISTS idx_eod_tasks_task ON public.eod_report_tasks (task_id);
