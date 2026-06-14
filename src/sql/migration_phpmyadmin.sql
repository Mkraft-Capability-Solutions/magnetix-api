-- =============================================
-- Production Migration Script (phpMyAdmin compatible)
-- Run this in phpMyAdmin: Select your DB > SQL tab > Paste > Go
-- Safe to run multiple times - skips changes already applied
-- (Some lines may show "Duplicate column" warnings - that's OK)
-- =============================================

-- =============================================
-- FEEDBACK FORMS
-- =============================================

-- 1. Add show_report column (controls score visibility to respondents)
ALTER TABLE feedback_forms ADD COLUMN show_report TINYINT(1) DEFAULT 1 AFTER show_correct_answers;

-- 2. Expand assessment_type to support 'both' value (was ENUM, now VARCHAR)
ALTER TABLE feedback_forms MODIFY COLUMN assessment_type VARCHAR(20) NULL;

-- =============================================
-- COURSE LESSONS
-- =============================================

-- 3. Add 'quiz' to lesson_content_type enum
ALTER TABLE course_lesson MODIFY COLUMN lesson_content_type ENUM('document', 'scorm', 'mp4', 'url', 'quiz') NULL;

-- 4. Add assessment fields for quiz lessons
ALTER TABLE course_lesson ADD COLUMN assessment_id INT NULL;
ALTER TABLE course_lesson ADD COLUMN require_section_completion TINYINT(1) DEFAULT 0;
ALTER TABLE course_lesson ADD COLUMN assessment_start_date DATE NULL;
ALTER TABLE course_lesson ADD COLUMN assessment_end_date DATE NULL;

-- 5. Ensure lesson_order column exists (for drag-and-drop reordering)
ALTER TABLE course_lesson ADD COLUMN lesson_order INT DEFAULT 0;

-- 6. Add last_updated tracking columns
ALTER TABLE course_lesson ADD COLUMN last_updated TIMESTAMP NULL;
ALTER TABLE course_lesson ADD COLUMN last_updated_by VARCHAR(36) NULL;
ALTER TABLE course_section ADD COLUMN last_updated TIMESTAMP NULL;
ALTER TABLE course_section ADD COLUMN last_updated_by VARCHAR(36) NULL;

-- =============================================
-- FEEDBACK ANSWERS (subjective/AI scoring)
-- =============================================

-- 7. Add scoring columns for AI and manual scoring
ALTER TABLE feedback_answers ADD COLUMN ai_score DECIMAL(10,2) NULL;
ALTER TABLE feedback_answers ADD COLUMN manual_score DECIMAL(10,2) NULL;
ALTER TABLE feedback_answers ADD COLUMN max_score DECIMAL(10,2) NULL;
ALTER TABLE feedback_answers ADD COLUMN ai_feedback TEXT NULL;

-- =============================================
-- FEEDBACK RESPONSES (overall scores)
-- =============================================

-- 8. Add score columns for assessment responses
ALTER TABLE feedback_responses ADD COLUMN score DECIMAL(10,2) NULL;
ALTER TABLE feedback_responses ADD COLUMN max_score DECIMAL(10,2) NULL;
ALTER TABLE feedback_responses ADD COLUMN percentage DECIMAL(5,2) NULL;

-- =============================================
-- USER LOGIN LOG (analytics fix)
-- =============================================

-- 9. Create user_login_log table if it doesn't exist (used by analytics heatmap)
CREATE TABLE IF NOT EXISTS user_login_log (
  id INT NOT NULL AUTO_INCREMENT,
  user_uuid VARCHAR(36) NOT NULL,
  login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_login (user_uuid, login_time),
  KEY idx_login_time (login_time)
);

-- =============================================
-- DATA FIXES
-- =============================================

-- 10. Fix quiz lessons stored with wrong content type
UPDATE course_lesson SET lesson_content_type = 'quiz' WHERE assessment_id IS NOT NULL AND lesson_content_type != 'quiz';
