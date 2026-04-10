-- Smart Parenting App — Database Schema (v2)
-- Run this in Supabase SQL Editor
--
-- Fixes applied (2026-04-10):
-- - Soft-delete on children (deleted_at)
-- - Auto-update updated_at trigger
-- - RLS policies split: separate SELECT/INSERT/UPDATE/DELETE with WITH CHECK
-- - Composite indexes for common queries
-- - Alerts: UPDATE policy for acknowledge
-- - Recommendations: UPDATE/DELETE policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════

-- Children profiles
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL  -- soft-delete
);

COMMENT ON TABLE children IS 'Child profiles — soft-deleted via deleted_at';

-- Activity logs
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('screen_time', 'sleep', 'meal', 'education')),
  value JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE activities IS 'Parent-logged child activities — no cascade delete (protect data)';

-- AI recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  category TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  based_on JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════

-- Composite: most common query is "activities for child X of type Y"
CREATE INDEX idx_activities_child_type ON activities(child_id, type);
CREATE INDEX idx_activities_child_recorded ON activities(child_id, recorded_at DESC);

-- Single-column for joins
CREATE INDEX idx_recommendations_child ON recommendations(child_id);
CREATE INDEX idx_alerts_child ON alerts(child_id);
CREATE INDEX idx_children_parent ON children(parent_id);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────
-- Children: direct ownership
-- ──────────────────────────────────────────

CREATE POLICY "children_select" ON children
  FOR SELECT USING (parent_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "children_insert" ON children
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "children_update" ON children
  FOR UPDATE USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "children_delete" ON children
  FOR DELETE USING (parent_id = auth.uid());

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
