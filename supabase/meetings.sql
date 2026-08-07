-- ============================================================================
-- AgencyOS — Meetings & Scheduling System
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- 1. meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  requested_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  requested_date   DATE NOT NULL,
  requested_time   TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status           TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'rescheduled', 'declined', 'completed')),
  admin_notes      TEXT,
  confirmed_date   DATE,
  confirmed_time   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Service Role full access
DROP POLICY IF EXISTS "meetings_service_all" ON public.meetings;
CREATE POLICY "meetings_service_all" ON public.meetings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Users can select meetings if they are the requester, client, or team member
DROP POLICY IF EXISTS "meetings_select" ON public.meetings;
CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid() OR
    public.is_team() OR
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Clients can request meetings
DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;
CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
  );

-- Admins / Team and clients can update meetings (e.g. status updates)
DROP POLICY IF EXISTS "meetings_update" ON public.meetings;
CREATE POLICY "meetings_update" ON public.meetings
  FOR UPDATE TO authenticated
  USING (
    requested_by = auth.uid() OR
    public.is_team()
  )
  WITH CHECK (
    requested_by = auth.uid() OR
    public.is_team()
  );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_client ON public.meetings (client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project ON public.meetings (project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings (status);
CREATE INDEX IF NOT EXISTS idx_meetings_requested_date ON public.meetings (requested_date);
