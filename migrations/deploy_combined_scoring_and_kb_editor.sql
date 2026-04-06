-- ================================================================
-- Deployment Migration: Combined Assessment Scoring Fix
--                     + Knowledge Base Rich Text Editor
-- ================================================================
-- Date: 2026-04-02
--
-- This migration ensures all required columns exist for:
--   1. Combined assessment scoring (objective + subjective)
--   2. Knowledge Base rich text article content
--
-- All statements are idempotent (safe to run multiple times).
-- No data is modified or deleted.
-- ================================================================

USE lms_db;

-- ----------------------------------------------------------------
-- 1. ASSESSMENT SCORING: Ensure required columns exist
-- ----------------------------------------------------------------

-- 1a. feedback_questions.correct_answers — stores correct option indices
--     Required by: aiScoreResponse() to evaluate objective answers in combined assessments
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions' AND COLUMN_NAME = 'correct_answers');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_questions` ADD COLUMN `correct_answers` JSON DEFAULT NULL COMMENT ''Array of correct option indices for assessment questions'' AFTER `options`',
  'SELECT ''feedback_questions.correct_answers already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. feedback_questions.score — max score per question
--     Required by: aiScoreResponse() and updateManualScores() for objective question scoring
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions' AND COLUMN_NAME = 'score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_questions` ADD COLUMN `score` DECIMAL(5,2) DEFAULT 1 COMMENT ''Maximum score for this question'' AFTER `correct_answers`',
  'SELECT ''feedback_questions.score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1c. feedback_responses.score, max_score, percentage — overall response scores
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_responses` ADD COLUMN `score` INT DEFAULT NULL COMMENT ''Total score for assessment submissions''',
  'SELECT ''feedback_responses.score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'max_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_responses` ADD COLUMN `max_score` INT DEFAULT NULL COMMENT ''Maximum possible score''',
  'SELECT ''feedback_responses.max_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'percentage');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_responses` ADD COLUMN `percentage` DECIMAL(5,2) DEFAULT NULL COMMENT ''Score as percentage''',
  'SELECT ''feedback_responses.percentage already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1d. feedback_answers — per-answer scoring columns for subjective/AI scoring
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'ai_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `ai_score` DECIMAL(5,2) DEFAULT NULL COMMENT ''AI-generated score for subjective answers'' AFTER `answer_rating`',
  'SELECT ''feedback_answers.ai_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'manual_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `manual_score` DECIMAL(5,2) DEFAULT NULL COMMENT ''Manual admin score (overrides AI)'' AFTER `ai_score`',
  'SELECT ''feedback_answers.manual_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'max_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `max_score` DECIMAL(5,2) DEFAULT NULL COMMENT ''Maximum possible score for this question'' AFTER `manual_score`',
  'SELECT ''feedback_answers.max_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'ai_feedback');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `ai_feedback` TEXT DEFAULT NULL COMMENT ''AI-generated feedback/reasoning'' AFTER `max_score`',
  'SELECT ''feedback_answers.ai_feedback already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1e. feedback_forms.assessment_type — distinguishes objective/subjective/both
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_forms` ADD COLUMN `assessment_type` ENUM(''objective'',''subjective'',''both'') DEFAULT ''objective'' COMMENT ''Assessment question type'' AFTER `type`',
  'SELECT ''feedback_forms.assessment_type already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 2. KNOWLEDGE BASE: Ensure kb_articles table exists
-- ----------------------------------------------------------------
-- The content column is TEXT and stores HTML from the rich text editor.
-- No schema change needed — existing TEXT column handles HTML content.
-- This just ensures the table exists if deploying to a fresh DB.

CREATE TABLE IF NOT EXISTS `kb_articles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `content` TEXT DEFAULT NULL COMMENT 'Article body — stores HTML from rich text editor',
  `excerpt` VARCHAR(500) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `tags` VARCHAR(500) DEFAULT NULL COMMENT 'Comma-separated tags',
  `cover_image` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('draft','published') NOT NULL DEFAULT 'draft',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_by` CHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  INDEX `idx_kb_articles_status` (`status`),
  INDEX `idx_kb_articles_category` (`category`),
  INDEX `idx_kb_articles_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------
-- 3. VERIFICATION: Print summary of all required columns
-- ----------------------------------------------------------------
SELECT
  'VERIFICATION' AS section,
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'lms_db'
  AND (
    (TABLE_NAME = 'feedback_questions' AND COLUMN_NAME IN ('correct_answers', 'score', 'options'))
    OR (TABLE_NAME = 'feedback_responses' AND COLUMN_NAME IN ('score', 'max_score', 'percentage'))
    OR (TABLE_NAME = 'feedback_answers' AND COLUMN_NAME IN ('ai_score', 'manual_score', 'max_score', 'ai_feedback', 'answer_options'))
    OR (TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type')
    OR (TABLE_NAME = 'kb_articles' AND COLUMN_NAME = 'content')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT 'Migration completed successfully! Safe to deploy.' AS result;
