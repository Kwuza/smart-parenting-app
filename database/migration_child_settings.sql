-- Migration: Add per-child screen time and sleep settings
-- Run in Supabase SQL Editor after existing schema

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS max_screen_time_minutes INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_sleep_minutes INTEGER DEFAULT NULL;

COMMENT ON COLUMN children.max_screen_time_minutes IS 'Max daily screen time in minutes. NULL = no limit set.';
COMMENT ON COLUMN children.min_sleep_minutes IS 'Min daily sleep in minutes. NULL = no minimum set.';
