-- Migration: Add assessment/quiz fields to course_lesson table
-- Run this on existing databases to add quiz support to lessons

-- Step 1: Modify lesson_content_type enum to include 'quiz'
ALTER TABLE course_lesson
  MODIFY COLUMN lesson_content_type ENUM('document', 'scorm', 'mp4', 'url', 'quiz') NULL;

-- Step 2: Add assessment-specific columns (skip if already exist)
ALTER TABLE course_lesson
  ADD COLUMN assessment_id INT NULL AFTER skills,
  ADD COLUMN require_section_completion TINYINT(1) DEFAULT 0 AFTER assessment_id,
  ADD COLUMN assessment_start_date DATE NULL AFTER require_section_completion,
  ADD COLUMN assessment_end_date DATE NULL AFTER assessment_start_date;

-- Step 3: Update the lesson SELECT in get_course_enrolled_details to include quiz fields
-- NOTE: If your get_course_enrolled_details stored procedure selects specific lesson columns,
-- add these columns to the lesson SELECT query:
--   l.assessment_id,
--   l.require_section_completion,
--   l.assessment_start_date,
--   l.assessment_end_date

SELECT 'Assessment fields added to course_lesson successfully' as message;
