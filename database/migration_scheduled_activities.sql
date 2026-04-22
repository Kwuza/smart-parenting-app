-- Scheduled Activities (for activity scheduling feature)
-- Requires: children table exists (already in schema.sql)

CREATE TABLE scheduled_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('screen_time', 'sleep', 'nap', 'physical_activity', 'education')),
  start_time TIMESTAMPTZ NOT NULL,
  min_duration_minutes INTEGER NOT NULL,
  max_duration_minutes INTEGER NOT NULL,
  planned_end_time TIMESTAMPTZ NOT NULL,
  category TEXT, -- screen_time only: 'leisure' | 'educational'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  min_notification_id TEXT, -- Expo notification ID
  max_notification_id TEXT, -- Expo notification ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE scheduled_activities IS 'Parent-planned child activities with min/max time and notifications';

-- Indexes
CREATE INDEX idx_scheduled_child ON scheduled_activities(child_id);
CREATE INDEX idx_scheduled_child_status ON scheduled_activities(child_id, status);
CREATE INDEX idx_scheduled_child_type ON scheduled_activities(child_id, type);
CREATE INDEX idx_scheduled_end_time ON scheduled_activities(planned_end_time) WHERE status = 'pending';

-- RLS
ALTER TABLE scheduled_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_select" ON scheduled_activities
  FOR SELECT USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "scheduled_insert" ON scheduled_activities
  FOR INSERT WITH CHECK (
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
