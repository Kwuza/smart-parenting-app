-- Migration: Add nap and physical_activity to activity types
-- Run this in Supabase SQL Editor if you already ran schema.sql

-- Drop the old constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;

-- Add new constraint with all 6 activity types
ALTER TABLE activities ADD CONSTRAINT activities_type_check
  CHECK (type IN ('screen_time', 'sleep', 'nap', 'meal', 'physical_activity', 'education'));
