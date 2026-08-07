-- ============================================================================
-- AgencyOS — Monthly Tasks Auto-Progress Migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- 1. Add progress and assigned_date columns if not exists
ALTER TABLE public.monthly_tasks ADD COLUMN IF NOT EXISTS progress NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.monthly_tasks ADD COLUMN IF NOT EXISTS assigned_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Ensure progress constraint (0 to 100)
ALTER TABLE public.monthly_tasks DROP CONSTRAINT IF EXISTS monthly_tasks_progress_check;
ALTER TABLE public.monthly_tasks ADD CONSTRAINT monthly_tasks_progress_check CHECK (progress >= 0 AND progress <= 100);
