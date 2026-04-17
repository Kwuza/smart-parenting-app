-- Migration: Add child routine schedule + physical measurements
-- Run in Supabase SQL Editor after existing schema and child_settings migration

-- ═══════════════════════════════════════════
-- SCHEDULE COLUMNS (TIME = HH:MM:SS format)
-- ═══════════════════════════════════════════

ALTER TABLE children
  -- Sleep routine
  ADD COLUMN IF NOT EXISTS bedtime TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wake_up_time TIME DEFAULT NULL,

  -- Meal times
  ADD COLUMN IF NOT EXISTS breakfast_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lunch_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS snack_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dinner_time TIME DEFAULT NULL,

  -- Activity times (NULL for 6+ = not set)
  ADD COLUMN IF NOT EXISTS nap_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS activity_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS learn_time TIME DEFAULT NULL,

  -- Physical measurements
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1) DEFAULT NULL,

  -- BMI auto-calculated via trigger
  ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,1) DEFAULT NULL;

-- ═══════════════════════════════════════════
-- BMI TRIGGER: auto-calculate on height/weight update
-- BMI = weight(kg) / height(m)²
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.height_cm IS NOT NULL AND NEW.weight_kg IS NOT NULL AND NEW.height_cm > 0 THEN
    NEW.bmi := ROUND((NEW.weight_kg / POWER(NEW.height_cm / 100.0, 2))::NUMERIC, 1);
  ELSE
    NEW.bmi := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS children_bmi_trigger ON children;
CREATE TRIGGER children_bmi_trigger
  BEFORE INSERT OR UPDATE OF height_cm, weight_kg ON children
  FOR EACH ROW EXECUTE FUNCTION calculate_bmi();

-- ═══════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════

COMMENT ON COLUMN children.bedtime IS 'Scheduled bedtime (HH:MM:SS). NULL = not set.';
COMMENT ON COLUMN children.wake_up_time IS 'Scheduled wake-up time (HH:MM:SS). NULL = not set.';
COMMENT ON COLUMN children.breakfast_time IS 'Scheduled breakfast time. NULL = not set.';
COMMENT ON COLUMN children.lunch_time IS 'Scheduled lunch time. NULL = not set.';
COMMENT ON COLUMN children.snack_time IS 'Scheduled snack time. NULL = not set.';
COMMENT ON COLUMN children.dinner_time IS 'Scheduled dinner time. NULL = not set.';
COMMENT ON COLUMN children.nap_time IS 'Scheduled nap time. NULL = not set or not applicable (6+).';
COMMENT ON COLUMN children.activity_time IS 'Scheduled physical activity time. NULL = not set or not applicable (6+).';
COMMENT ON COLUMN children.learn_time IS 'Scheduled learning/education time. NULL = not set or not applicable (6+).';
COMMENT ON COLUMN children.height_cm IS 'Height in centimeters. NULL = not measured.';
COMMENT ON COLUMN children.weight_kg IS 'Weight in kilograms. NULL = not measured.';
COMMENT ON COLUMN children.bmi IS 'Auto-calculated BMI = weight(kg) / height(m)². Trigger-computed.';
