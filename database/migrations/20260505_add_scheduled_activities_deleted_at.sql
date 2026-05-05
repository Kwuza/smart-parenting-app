-- Add soft-delete support for scheduled activities.
-- Apply this in Supabase SQL Editor before installing/running APKs that query
-- scheduled_activities.deleted_at.

BEGIN;

ALTER TABLE public.scheduled_activities
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

DROP POLICY IF EXISTS "scheduled_select" ON public.scheduled_activities;
CREATE POLICY "scheduled_select" ON public.scheduled_activities
  FOR SELECT USING (
    deleted_at IS NULL AND
    child_id IN (
      SELECT id
      FROM public.children
      WHERE parent_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "scheduled_insert" ON public.scheduled_activities;
CREATE POLICY "scheduled_insert" ON public.scheduled_activities
  FOR INSERT WITH CHECK (
    deleted_at IS NULL AND
    child_id IN (
      SELECT id
      FROM public.children
      WHERE parent_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

COMMIT;
