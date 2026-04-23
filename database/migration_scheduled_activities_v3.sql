-- Scheduled Activities v3: Add food_groups for meal planning
-- Run after migration_scheduled_activities_v2.sql

-- Add food_groups array column for scheduled meals
ALTER TABLE scheduled_activities ADD COLUMN IF NOT EXISTS food_groups TEXT[];

COMMENT ON COLUMN scheduled_activities.food_groups IS 'For meal schedules: planned food groups (fruits, vegetables, protein, grains, dairy)';
