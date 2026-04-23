-- Migration: add_insight_type_and_trend_to_recommendations
-- Adds AI insight classification fields to the recommendations table
-- Run this in Supabase SQL Editor (can be run repeatedly safely)

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS insight_type TEXT CHECK (insight_type IN ('risk', 'opportunity', 'follow_up', 'positive'));

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS trend TEXT CHECK (trend IN ('worsening', 'stable', 'improving'));