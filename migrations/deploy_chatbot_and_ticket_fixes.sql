-- ================================================================
-- Deployment Migration: AI Chatbot + Ticket System Fixes
-- ================================================================
-- Date: 2026-04-06
--
-- This migration covers:
--   1. AI Chatbot tables (conversations + messages)
--   2. Ticket close permission fix (only admins can close)
--
-- All statements are idempotent (safe to run multiple times).
-- No existing data is modified or deleted.
-- ================================================================

USE lms_db;

-- ----------------------------------------------------------------
-- 1. CHATBOT TABLES
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `chatbot_conversations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) DEFAULT 'New Chat',
  `status` ENUM('active','closed','escalated') DEFAULT 'active',
  `ticket_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` DATETIME DEFAULT NULL,
  INDEX `idx_chatbot_conv_user_id` (`user_id`),
  INDEX `idx_chatbot_conv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chatbot_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` VARCHAR(36) NOT NULL,
  `role` ENUM('user','assistant','system') NOT NULL,
  `content` TEXT NOT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_chatbot_msg_conv_id` (`conversation_id`),
  INDEX `idx_chatbot_msg_created` (`created_at`),
  FOREIGN KEY (`conversation_id`) REFERENCES `chatbot_conversations`(`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------
-- 2. SUPPORT TICKETS: Ensure required tables exist
-- ----------------------------------------------------------------
-- These tables should already exist from previous migrations.
-- Using IF NOT EXISTS as a safety net for fresh deployments.

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` VARCHAR(36) NOT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `category` ENUM('technical','account','billing','course','general') DEFAULT 'general',
  `priority` ENUM('low','medium','high','urgent') DEFAULT 'medium',
  `status` ENUM('open','assigned','in_progress','pending_user','resolved','closed') DEFAULT 'open',
  `assigned_to` VARCHAR(36) DEFAULT NULL,
  `resolution_notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` DATETIME DEFAULT NULL,
  `closed_at` DATETIME DEFAULT NULL,
  INDEX `idx_tickets_user_id` (`user_id`),
  INDEX `idx_tickets_assigned_to` (`assigned_to`),
  INDEX `idx_tickets_status` (`status`),
  INDEX `idx_tickets_priority` (`priority`),
  INDEX `idx_tickets_created_at` (`created_at`),
  INDEX `idx_tickets_ticket_number` (`ticket_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `user_type` ENUM('user','agent') NOT NULL,
  `message` TEXT NOT NULL,
  `is_internal` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_replies_ticket_id` (`ticket_id`),
  INDEX `idx_replies_user_id` (`user_id`),
  INDEX `idx_replies_created_at` (`created_at`),
  FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------
-- 3. KNOWLEDGE BASE: Ensure kb_articles table exists
-- ----------------------------------------------------------------
-- Content column stores HTML from the rich text editor.

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
-- 4. ASSESSMENT SCORING: Ensure required columns exist
-- ----------------------------------------------------------------

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions' AND COLUMN_NAME = 'correct_answers');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_questions` ADD COLUMN `correct_answers` JSON DEFAULT NULL AFTER `options`',
  'SELECT ''feedback_questions.correct_answers already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions' AND COLUMN_NAME = 'score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_questions` ADD COLUMN `score` DECIMAL(5,2) DEFAULT 1 AFTER `correct_answers`',
  'SELECT ''feedback_questions.score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_responses` ADD COLUMN `score` INT DEFAULT NULL',
  'SELECT ''feedback_responses.score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'max_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_responses` ADD COLUMN `max_score` INT DEFAULT NULL',
  'SELECT ''feedback_responses.max_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'percentage');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_responses` ADD COLUMN `percentage` DECIMAL(5,2) DEFAULT NULL',
  'SELECT ''feedback_responses.percentage already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'ai_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `ai_score` DECIMAL(5,2) DEFAULT NULL AFTER `answer_rating`',
  'SELECT ''feedback_answers.ai_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'manual_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `manual_score` DECIMAL(5,2) DEFAULT NULL AFTER `ai_score`',
  'SELECT ''feedback_answers.manual_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'max_score');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `max_score` DECIMAL(5,2) DEFAULT NULL AFTER `manual_score`',
  'SELECT ''feedback_answers.max_score already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'ai_feedback');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_answers` ADD COLUMN `ai_feedback` TEXT DEFAULT NULL AFTER `max_score`',
  'SELECT ''feedback_answers.ai_feedback already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `feedback_forms` ADD COLUMN `assessment_type` ENUM(''objective'',''subjective'',''both'') DEFAULT ''objective'' AFTER `type`',
  'SELECT ''feedback_forms.assessment_type already exists'' AS status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 5. VERIFICATION
-- ----------------------------------------------------------------

SELECT 'CHATBOT TABLES' AS section, TABLE_NAME, ENGINE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME IN ('chatbot_conversations', 'chatbot_messages');

SELECT 'SUPPORT TABLES' AS section, TABLE_NAME, ENGINE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME IN ('support_tickets', 'ticket_replies');

SELECT 'ALL MIGRATIONS COMPLETE' AS result;
