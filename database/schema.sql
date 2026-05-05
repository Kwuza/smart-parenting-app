-- Smart Parenting App — Consolidated Database Schema
-- Run this single file in Supabase SQL Editor for a fresh project.
--
-- Consolidated on 2026-04-25 from the former base schema plus:
-- - 002_add_avatar_url.sql
-- - 002_avatars_bucket.sql
-- - migration_add_activity_types.sql
-- - migration_child_settings.sql
-- - migration_child_routine.sql
-- - migration_gender.sql
-- - migration_child_notifications.sql
-- - migration_scheduled_activities.sql
-- - migration_scheduled_activities_v2.sql
-- - migration_scheduled_activities_v3.sql
-- - migrations/001_add_insight_type_and_trend.sql
--
-- Notes:
-- - Core app tables use Supabase Auth ownership with RLS.
-- - children are soft-deleted via deleted_at and hidden from child-scoped policies.
-- - Edge Functions run with service-role credentials and intentionally bypass RLS.

-- ═══════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,

  -- Profile / avatar
  avatar_url TEXT,
  gender TEXT DEFAULT NULL CONSTRAINT children_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female')),

  -- Per-child limits
  max_screen_time_minutes INTEGER DEFAULT NULL,
  min_sleep_minutes INTEGER DEFAULT NULL,

  -- Routine schedule (TIME = HH:MM:SS)
  bedtime TIME DEFAULT NULL,
  wake_up_time TIME DEFAULT NULL,
  breakfast_time TIME DEFAULT NULL,
  lunch_time TIME DEFAULT NULL,
  snack_time TIME DEFAULT NULL,
  dinner_time TIME DEFAULT NULL,
  nap_time TIME DEFAULT NULL,
  activity_time TIME DEFAULT NULL,
  learn_time TIME DEFAULT NULL,

  -- Physical measurements
  height_cm NUMERIC(5,1) DEFAULT NULL,
  weight_kg NUMERIC(5,1) DEFAULT NULL,
  bmi NUMERIC(4,1) DEFAULT NULL,

  -- Per-routine notification toggles
  notifications JSONB DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

COMMENT ON TABLE children IS 'Child profiles — soft-deleted via deleted_at';

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CONSTRAINT activities_type_check
    CHECK (type IN ('screen_time', 'sleep', 'nap', 'meal', 'physical_activity', 'education')),
  value JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE activities IS 'Parent-logged child activities — no cascade delete (protect data)';

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  category TEXT,
  priority TEXT CONSTRAINT recommendations_priority_check
    CHECK (priority IN ('low', 'medium', 'high')),
  insight_type TEXT CONSTRAINT recommendations_insight_type_check
    CHECK (insight_type IN ('risk', 'opportunity', 'follow_up', 'positive')),
  trend TEXT CONSTRAINT recommendations_trend_check
    CHECK (trend IN ('worsening', 'stable', 'improving')),
  based_on JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE recommendations IS 'AI-generated child recommendations with JSONB based_on audit trail';

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CONSTRAINT alerts_severity_check
    CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE alerts IS 'Child alerts generated from parent-entered activity data';

CREATE TABLE IF NOT EXISTS scheduled_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CONSTRAINT scheduled_activities_type_check
    CHECK (type IN ('screen_time', 'sleep', 'nap', 'physical_activity', 'education', 'meal')),
  start_time TIMESTAMPTZ NOT NULL,
  min_duration_minutes INTEGER,
  max_duration_minutes INTEGER,
  planned_end_time TIMESTAMPTZ NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CONSTRAINT scheduled_activities_status_check
    CHECK (status IN ('pending', 'completed', 'skipped')),
  min_notification_id TEXT,
  max_notification_id TEXT,
  meal_type TEXT,
  food_groups TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

COMMENT ON TABLE scheduled_activities IS 'Parent-planned child activities with min/max time and notifications';

-- ═══════════════════════════════════════════
-- COMPATIBILITY GUARDS FOR OLDER PARTIAL DATABASES
-- ═══════════════════════════════════════════
-- These make the consolidated schema usable after an older schema.sql was run.
-- Fresh projects already get these columns from the CREATE TABLE statements above.

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_screen_time_minutes INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_sleep_minutes INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bedtime TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wake_up_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS breakfast_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lunch_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS snack_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dinner_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nap_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS activity_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS learn_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT NULL;

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS insight_type TEXT,
  ADD COLUMN IF NOT EXISTS trend TEXT;

ALTER TABLE scheduled_activities
  ADD COLUMN IF NOT EXISTS meal_type TEXT,
  ADD COLUMN IF NOT EXISTS food_groups TEXT[],
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE scheduled_activities ALTER COLUMN min_duration_minutes DROP NOT NULL;
ALTER TABLE scheduled_activities ALTER COLUMN max_duration_minutes DROP NOT NULL;

ALTER TABLE children DROP CONSTRAINT IF EXISTS children_gender_check;
ALTER TABLE children ADD CONSTRAINT children_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female'));

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check
  CHECK (type IN ('screen_time', 'sleep', 'nap', 'meal', 'physical_activity', 'education'));

ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_priority_check;
ALTER TABLE recommendations ADD CONSTRAINT recommendations_priority_check
  CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_insight_type_check;
ALTER TABLE recommendations ADD CONSTRAINT recommendations_insight_type_check
  CHECK (insight_type IN ('risk', 'opportunity', 'follow_up', 'positive'));

ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_trend_check;
ALTER TABLE recommendations ADD CONSTRAINT recommendations_trend_check
  CHECK (trend IN ('worsening', 'stable', 'improving'));

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_severity_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_severity_check
  CHECK (severity IN ('info', 'warning', 'critical'));

ALTER TABLE scheduled_activities DROP CONSTRAINT IF EXISTS scheduled_activities_type_check;
ALTER TABLE scheduled_activities ADD CONSTRAINT scheduled_activities_type_check
  CHECK (type IN ('screen_time', 'sleep', 'nap', 'physical_activity', 'education', 'meal'));

ALTER TABLE scheduled_activities DROP CONSTRAINT IF EXISTS scheduled_activities_status_check;
ALTER TABLE scheduled_activities ADD CONSTRAINT scheduled_activities_status_check
  CHECK (status IN ('pending', 'completed', 'skipped'));

-- Column comments live after compatibility guards so rerunning this file on an
-- older partial database cannot fail before ADD COLUMN IF NOT EXISTS executes.
COMMENT ON COLUMN children.avatar_url IS 'Public avatar URL or emoji/icon string for the child profile.';
COMMENT ON COLUMN children.gender IS 'Child gender for BMI WHO LMS calculation. NULL = not set yet.';
COMMENT ON COLUMN children.max_screen_time_minutes IS 'Max daily screen time in minutes. NULL = no limit set.';
COMMENT ON COLUMN children.min_sleep_minutes IS 'Min daily sleep in minutes. NULL = no minimum set.';
COMMENT ON COLUMN children.bedtime IS 'Scheduled bedtime (HH:MM:SS). NULL = not set.';
COMMENT ON COLUMN children.wake_up_time IS 'Scheduled wake-up time (HH:MM:SS). NULL = not set.';
COMMENT ON COLUMN children.breakfast_time IS 'Scheduled breakfast time. NULL = not set.';
COMMENT ON COLUMN children.lunch_time IS 'Scheduled lunch time. NULL = not set.';
COMMENT ON COLUMN children.snack_time IS 'Scheduled snack time. NULL = not set.';
COMMENT ON COLUMN children.dinner_time IS 'Scheduled dinner time. NULL = not set.';
COMMENT ON COLUMN children.nap_time IS 'Scheduled nap time. NULL = not set or not applicable (6+).';
COMMENT ON COLUMN children.activity_time IS 'Scheduled physical activity time. NULL = not set or not applicable (6+).';
COMMENT ON COLUMN children.learn_time IS 'Scheduled learning/education time. NULL = not set or not applicable (6+).';
COMMENT ON COLUMN children.height_cm IS 'Height in centimeters. NULL = not measured.';
COMMENT ON COLUMN children.weight_kg IS 'Weight in kilograms. NULL = not measured.';
COMMENT ON COLUMN children.bmi IS 'Auto-calculated BMI = weight(kg) / height(m)². Trigger-computed.';
COMMENT ON COLUMN children.notifications IS 'Per-routine notification toggles: { "bedtime": bool, "wake_up": bool, ... }';
COMMENT ON COLUMN recommendations.insight_type IS 'AI insight classification: risk, opportunity, follow_up, or positive.';
COMMENT ON COLUMN recommendations.trend IS 'Observed direction for the cited metric: worsening, stable, or improving.';
COMMENT ON COLUMN scheduled_activities.category IS 'For screen_time schedules: leisure or educational.';
COMMENT ON COLUMN scheduled_activities.meal_type IS 'For meal schedules: breakfast, lunch, snack, dinner';
COMMENT ON COLUMN scheduled_activities.food_groups IS 'For meal schedules: planned food groups (fruits, vegetables, protein, grains, dairy)';

-- ═══════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS children_updated_at ON children;
CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.height_cm IS NOT NULL AND NEW.weight_kg IS NOT NULL AND NEW.height_cm > 0 THEN
    NEW.bmi := ROUND((NEW.weight_kg / POWER(NEW.height_cm / 100.0, 2))::NUMERIC, 1);
  ELSE
    NEW.bmi := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS children_bmi_trigger ON children;
CREATE TRIGGER children_bmi_trigger
  BEFORE INSERT OR UPDATE OF height_cm, weight_kg ON children
  FOR EACH ROW EXECUTE FUNCTION calculate_bmi();

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

CREATE INDEX IF NOT EXISTS idx_activities_child_type ON activities(child_id, type);
CREATE INDEX IF NOT EXISTS idx_activities_child_recorded ON activities(child_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_child ON recommendations(child_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_child_created ON recommendations(child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_child ON alerts(child_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_child ON scheduled_activities(child_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_child_status ON scheduled_activities(child_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_child_type ON scheduled_activities(child_id, type);
CREATE INDEX IF NOT EXISTS idx_scheduled_end_time ON scheduled_activities(planned_end_time) WHERE status = 'pending';

-- ═══════════════════════════════════════════
-- STORAGE: AVATARS BUCKET
-- ═══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE OR REPLACE FUNCTION public.is_owned_avatar_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, storage
AS $$
  SELECT
    (
      (storage.foldername(object_name))[1] = 'avatars'
      AND LEFT(storage.filename(object_name), LENGTH(auth.uid()::TEXT) + 1) = auth.uid()::TEXT || '_'
    )
    OR
    (
      (storage.foldername(object_name))[1] = 'child-avatars'
      AND (
        LEFT(storage.filename(object_name), LENGTH(auth.uid()::TEXT) + 1) = auth.uid()::TEXT || '_'
        OR (
          split_part(storage.filename(object_name), '_', 1) ~* '^[0-9a-f-]{36}$'
          AND split_part(storage.filename(object_name), '_', 1)::UUID IN (
            SELECT id
            FROM public.children
            WHERE parent_id = auth.uid()
              AND deleted_at IS NULL
          )
        )
      )
    );
$$;

DROP POLICY IF EXISTS "Allow authenticated uploads to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload child avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND public.is_owned_avatar_object(name)
);

CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND public.is_owned_avatar_object(name)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND public.is_owned_avatar_object(name)
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND public.is_owned_avatar_object(name)
);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_activities ENABLE ROW LEVEL SECURITY;

-- Existing policies are dropped first so this file can be rerun safely.

DROP POLICY IF EXISTS "children_select" ON children;
DROP POLICY IF EXISTS "children_insert" ON children;
DROP POLICY IF EXISTS "children_update" ON children;
DROP POLICY IF EXISTS "children_delete" ON children;

DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;
DROP POLICY IF EXISTS "activities_update" ON activities;
DROP POLICY IF EXISTS "activities_delete" ON activities;

DROP POLICY IF EXISTS "recommendations_select" ON recommendations;
DROP POLICY IF EXISTS "recommendations_insert" ON recommendations;
DROP POLICY IF EXISTS "recommendations_update" ON recommendations;
DROP POLICY IF EXISTS "recommendations_delete" ON recommendations;

DROP POLICY IF EXISTS "alerts_select" ON alerts;
DROP POLICY IF EXISTS "alerts_insert" ON alerts;
DROP POLICY IF EXISTS "alerts_update" ON alerts;
DROP POLICY IF EXISTS "alerts_delete" ON alerts;

DROP POLICY IF EXISTS "scheduled_select" ON scheduled_activities;
DROP POLICY IF EXISTS "scheduled_insert" ON scheduled_activities;
DROP POLICY IF EXISTS "scheduled_update" ON scheduled_activities;
DROP POLICY IF EXISTS "scheduled_delete" ON scheduled_activities;

-- ──────────────────────────────────────────
-- Children: direct ownership
-- ──────────────────────────────────────────

CREATE POLICY "children_select" ON children
  FOR SELECT USING (parent_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "children_insert" ON children
  FOR INSERT WITH CHECK (parent_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "children_update" ON children
  FOR UPDATE USING (parent_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "children_delete" ON children
  FOR DELETE USING (parent_id = auth.uid() AND deleted_at IS NULL);

-- ──────────────────────────────────────────
-- Activities: access via child ownership
-- ──────────────────────────────────────────

CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  )
  WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

-- ──────────────────────────────────────────
-- Recommendations: access via child ownership
-- ──────────────────────────────────────────

CREATE POLICY "recommendations_select" ON recommendations
  FOR SELECT USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "recommendations_insert" ON recommendations
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "recommendations_update" ON recommendations
  FOR UPDATE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  )
  WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "recommendations_delete" ON recommendations
  FOR DELETE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

-- ──────────────────────────────────────────
-- Alerts: access via child ownership
-- ──────────────────────────────────────────

CREATE POLICY "alerts_select" ON alerts
  FOR SELECT USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "alerts_insert" ON alerts
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  )
  WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "alerts_delete" ON alerts
  FOR DELETE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

-- ──────────────────────────────────────────
-- Scheduled activities: access via child ownership
-- ──────────────────────────────────────────

CREATE POLICY "scheduled_select" ON scheduled_activities
  FOR SELECT USING (
    deleted_at IS NULL AND
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "scheduled_insert" ON scheduled_activities
  FOR INSERT WITH CHECK (
    deleted_at IS NULL AND
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "scheduled_update" ON scheduled_activities
  FOR UPDATE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  )
  WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "scheduled_delete" ON scheduled_activities
  FOR DELETE USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );
