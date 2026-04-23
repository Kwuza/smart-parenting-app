-- Migration: Add notifications JSONB column to children table
-- Stores per-routine notification toggles for each child.
-- Example: { "bedtime": true, "wake_up": true, "breakfast": false, ... }
--
-- Run this in Supabase SQL Editor

ALTER TABLE children ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT NULL;

-- RLS already allows UPDATE on children for the owner
-- No new policy needed — existing children_update policy covers it.

COMMENT ON COLUMN children.notifications IS 'Per-routine notification toggles: { "bedtime": bool, "wake_up": bool, ... }';
