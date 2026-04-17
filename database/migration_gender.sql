-- Migration: Add gender column to children table
-- Run in Supabase SQL Editor after child_routine migration
-- Gender is needed for accurate BMI assessment (WHO LMS params differ by gender)

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL
    CHECK (gender IS NULL OR gender IN ('male', 'female'));

COMMENT ON COLUMN children.gender IS 'Child gender for BMI WHO LMS calculation. NULL = not set yet.';
