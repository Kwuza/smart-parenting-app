-- Scheduled Activities v2: Add 'meal' type + make durations nullable
-- Run after migration_scheduled_activities.sql

-- 1. Drop existing CHECK constraint and recreate with 'meal'
ALTER TABLE scheduled_activities DROP CONSTRAINT IF EXISTS scheduled_activities_type_check;
ALTER TABLE scheduled_activities ADD CONSTRAINT scheduled_activities_type_check
  CHECK (type IN ('screen_time', 'sleep', 'nap', 'physical_activity', 'education', 'meal'));

-- 2. Make durations nullable so meal reminders (start-time only) are valid
ALTER TABLE scheduled_activities ALTER COLUMN min_duration_minutes DROP NOT NULL;
ALTER TABLE scheduled_activities ALTER COLUMN max_duration_minutes DROP NOT NULL;

-- 3. Add meal_type column for scheduled meals (breakfast/lunch/snack/dinner)
ALTER TABLE scheduled_activities ADD COLUMN IF NOT EXISTS meal_type TEXT;

COMMENT ON COLUMN scheduled_activities.meal_type IS 'For meal schedules: breakfast, lunch, snack, dinner';
