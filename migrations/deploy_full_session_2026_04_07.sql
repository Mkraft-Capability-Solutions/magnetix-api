-- ================================================================
-- FULL DEPLOYMENT MIGRATION
-- ================================================================
-- Covers all changes from this development session:
--   1. Combined assessment scoring fix (objective + subjective)
--   2. Knowledge base rich text editor (HTML content)
--   3. AI Chatbot tables (conversations + messages)
--   4. Support ticket system tables (safety net)
--   5. Assessment scoring columns (safety net)
--
-- ALL statements are idempotent — safe to run multiple times.
-- NO existing data is modified or deleted.
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
-- 2. SUPPORT TICKET TABLES (safety net for fresh deployments)
-- ----------------------------------------------------------------

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
-- 3. KNOWLEDGE BASE TABLE (for rich text editor HTML content)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kb_articles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `content` TEXT DEFAULT NULL,
  `excerpt` VARCHAR(500) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `tags` VARCHAR(500) DEFAULT NULL,
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
-- 4. ASSESSMENT SCORING COLUMNS (idempotent — checks before adding)
-- ----------------------------------------------------------------

-- feedback_questions.correct_answers
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions' AND COLUMN_NAME = 'correct_answers');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_questions` ADD COLUMN `correct_answers` JSON DEFAULT NULL AFTER `options`', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_questions.score
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions' AND COLUMN_NAME = 'score');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_questions` ADD COLUMN `score` DECIMAL(5,2) DEFAULT 1 AFTER `correct_answers`', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_responses.score
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'score');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_responses` ADD COLUMN `score` INT DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_responses.max_score
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'max_score');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_responses` ADD COLUMN `max_score` INT DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_responses.percentage
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses' AND COLUMN_NAME = 'percentage');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_responses` ADD COLUMN `percentage` DECIMAL(5,2) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_answers.ai_score
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'ai_score');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_answers` ADD COLUMN `ai_score` DECIMAL(5,2) DEFAULT NULL AFTER `answer_rating`', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_answers.manual_score
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'manual_score');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_answers` ADD COLUMN `manual_score` DECIMAL(5,2) DEFAULT NULL AFTER `ai_score`', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_answers.max_score
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'max_score');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_answers` ADD COLUMN `max_score` DECIMAL(5,2) DEFAULT NULL AFTER `manual_score`', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_answers.ai_feedback
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers' AND COLUMN_NAME = 'ai_feedback');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_answers` ADD COLUMN `ai_feedback` TEXT DEFAULT NULL AFTER `max_score`', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- feedback_forms.assessment_type
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type');
SET @q = IF(@col = 0, 'ALTER TABLE `feedback_forms` ADD COLUMN `assessment_type` ENUM(''objective'',''subjective'',''both'') DEFAULT ''objective'' AFTER `type`', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- ----------------------------------------------------------------
-- 5. VERIFICATION
-- ----------------------------------------------------------------

SELECT 'TABLES' AS check_type, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'lms_db'
  AND TABLE_NAME IN (
    'chatbot_conversations', 'chatbot_messages',
    'support_tickets', 'ticket_replies',
    'kb_articles'
  )
ORDER BY TABLE_NAME;

SELECT 'SCORING COLUMNS' AS check_type, TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'lms_db'
  AND (
    (TABLE_NAME = 'feedback_questions' AND COLUMN_NAME IN ('correct_answers', 'score'))
    OR (TABLE_NAME = 'feedback_responses' AND COLUMN_NAME IN ('score', 'max_score', 'percentage'))
    OR (TABLE_NAME = 'feedback_answers' AND COLUMN_NAME IN ('ai_score', 'manual_score', 'max_score', 'ai_feedback'))
    OR (TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT '✅ ALL MIGRATIONS COMPLETE — SAFE TO DEPLOY' AS result;
