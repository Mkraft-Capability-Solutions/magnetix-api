-- =============================================
-- Production Migration Script (Full version with safety checks)
-- All schema changes from recent session
-- Run this ONCE on your production database
-- =============================================
-- NOTE: Each ALTER is wrapped in a procedure to safely skip if already applied.
-- This makes the script idempotent (safe to run multiple times).

DELIMITER //

-- Helper: Add column only if it doesn't exist
DROP PROCEDURE IF EXISTS safe_add_column//
CREATE PROCEDURE safe_add_column(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  );
  IF @col_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('Added column: ', p_table, '.', p_column) AS result;
  ELSE
    SELECT CONCAT('Column already exists: ', p_table, '.', p_column) AS result;
  END IF;
END//

DELIMITER ;

-- =============================================
-- FEEDBACK FORMS
-- =============================================

-- 1. Add show_report column (controls score visibility to respondents)
CALL safe_add_column('feedback_forms', 'show_report', 'TINYINT(1) DEFAULT 1 AFTER show_correct_answers');

-- 2. Expand assessment_type to support 'both' value
SET @is_enum = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'feedback_forms'
    AND COLUMN_NAME = 'assessment_type'
    AND DATA_TYPE = 'enum'
);
SET @modify_sql = IF(@is_enum > 0,
  'ALTER TABLE feedback_forms MODIFY COLUMN assessment_type VARCHAR(20) NULL',
  'SELECT "assessment_type already VARCHAR or does not exist" AS result'
);
PREPARE stmt FROM @modify_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- COURSE LESSONS
-- =============================================

-- 3. Add 'quiz' to lesson_content_type enum
SET @has_quiz = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_lesson'
    AND COLUMN_NAME = 'lesson_content_type'
    AND COLUMN_TYPE LIKE '%quiz%'
);
SET @quiz_sql = IF(@has_quiz = 0,
  "ALTER TABLE course_lesson MODIFY COLUMN lesson_content_type ENUM('document', 'scorm', 'mp4', 'url', 'quiz') NULL",
  'SELECT "lesson_content_type already has quiz" AS result'
);
PREPARE stmt FROM @quiz_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add assessment fields
CALL safe_add_column('course_lesson', 'assessment_id', 'INT NULL');
CALL safe_add_column('course_lesson', 'require_section_completion', 'TINYINT(1) DEFAULT 0');
CALL safe_add_column('course_lesson', 'assessment_start_date', 'DATE NULL');
CALL safe_add_column('course_lesson', 'assessment_end_date', 'DATE NULL');

-- 5. Ensure lesson_order exists (for drag-and-drop reordering)
CALL safe_add_column('course_lesson', 'lesson_order', 'INT DEFAULT 0');

-- 6. Add last_updated tracking columns
CALL safe_add_column('course_lesson', 'last_updated', 'TIMESTAMP NULL');
CALL safe_add_column('course_lesson', 'last_updated_by', 'VARCHAR(36) NULL');
CALL safe_add_column('course_section', 'last_updated', 'TIMESTAMP NULL');
CALL safe_add_column('course_section', 'last_updated_by', 'VARCHAR(36) NULL');

-- =============================================
-- FEEDBACK ANSWERS (subjective/AI scoring)
-- =============================================

CALL safe_add_column('feedback_answers', 'ai_score', 'DECIMAL(10,2) NULL');
CALL safe_add_column('feedback_answers', 'manual_score', 'DECIMAL(10,2) NULL');
CALL safe_add_column('feedback_answers', 'max_score', 'DECIMAL(10,2) NULL');
CALL safe_add_column('feedback_answers', 'ai_feedback', 'TEXT NULL');

-- =============================================
-- FEEDBACK RESPONSES (overall scores)
-- =============================================

CALL safe_add_column('feedback_responses', 'score', 'DECIMAL(10,2) NULL');
CALL safe_add_column('feedback_responses', 'max_score', 'DECIMAL(10,2) NULL');
CALL safe_add_column('feedback_responses', 'percentage', 'DECIMAL(5,2) NULL');

-- =============================================
-- USER LOGIN LOG (used by analytics heatmap)
-- =============================================

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

-- Fix quiz lessons stored with wrong content type
UPDATE course_lesson
SET lesson_content_type = 'quiz'
WHERE assessment_id IS NOT NULL
  AND lesson_content_type != 'quiz';

-- =============================================
-- CLEANUP
-- =============================================

DROP PROCEDURE IF EXISTS safe_add_column;

SELECT '--- Migration completed successfully ---' AS status;
