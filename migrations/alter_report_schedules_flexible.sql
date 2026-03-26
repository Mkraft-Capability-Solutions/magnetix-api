-- Migration: Flexible Report Scheduling
-- Adds support for multi-date selection, new frequency types, and AI-assisted scheduling

-- 1. Expand frequency ENUM
ALTER TABLE report_schedules
  MODIFY COLUMN frequency ENUM('once', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'custom') NOT NULL DEFAULT 'weekly';

-- 2. Add schedule_name column
ALTER TABLE report_schedules
  ADD COLUMN schedule_name VARCHAR(100) NULL;

-- 3. Add days_of_week JSON column
ALTER TABLE report_schedules
  ADD COLUMN days_of_week JSON NULL;

-- 4. Add days_of_month JSON column
ALTER TABLE report_schedules
  ADD COLUMN days_of_month JSON NULL;

-- 5. Add specific_dates JSON column
ALTER TABLE report_schedules
  ADD COLUMN specific_dates JSON NULL;

-- 6. Add repeat_end_date column
ALTER TABLE report_schedules
  ADD COLUMN repeat_end_date DATE NULL;

-- 7. Migrate existing weekly schedules
UPDATE report_schedules
  SET days_of_week = JSON_ARRAY(day_of_week)
  WHERE frequency = 'weekly' AND day_of_week IS NOT NULL AND days_of_week IS NULL;

-- 8. Migrate existing monthly schedules
UPDATE report_schedules
  SET days_of_month = JSON_ARRAY(day_of_month)
  WHERE frequency = 'monthly' AND day_of_month IS NOT NULL AND days_of_month IS NULL;
