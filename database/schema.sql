-- Smart Parenting App — Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Children profiles
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('screen_time', 'sleep', 'meal', 'education')),
  value JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  based_on JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activities_child ON activities(child_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_recorded ON activities(recorded_at);
CREATE INDEX idx_recommendations_child ON recommendations(child_id);
CREATE INDEX idx_alerts_child ON alerts(child_id);

-- Row Level Security
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own children's data
CREATE POLICY "Users can view own children" ON children
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Users can insert own children" ON children
  FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Users can update own children" ON children
  FOR UPDATE USING (parent_id = auth.uid());
CREATE POLICY "Users can delete own children" ON children
  FOR DELETE USING (parent_id = auth.uid());

-- Activities: access via child ownership
CREATE POLICY "Users can manage children's activities" ON activities
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Recommendations: access via child ownership
CREATE POLICY "Users can view children's recommendations" ON recommendations
  FOR SELECT USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );
CREATE POLICY "Users can insert recommendations" ON recommendations
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Alerts: access via child ownership
CREATE POLICY "Users can manage children's alerts" ON alerts
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );
