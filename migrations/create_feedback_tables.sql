-- ========================================
-- Feedback Forms Tables Migration
-- ========================================
-- Creates tables for public feedback forms system
-- ========================================

USE lms_db;

-- ========================================
-- 1. Feedback Forms - Core form metadata
-- ========================================
CREATE TABLE IF NOT EXISTS `feedback_forms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  `slug` VARCHAR(100) NOT NULL UNIQUE COMMENT '16-char hex for public URL',
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `type` ENUM('feedback', 'satisfaction', 'assessment') DEFAULT 'feedback',
  `status` ENUM('draft', 'active', 'closed') DEFAULT 'draft',

  -- Access Controls
  `expiry_date` DATETIME DEFAULT NULL COMMENT 'Form expires after this date',
  `max_responses` INT DEFAULT NULL COMMENT 'Maximum number of responses allowed',
  `one_per_browser` TINYINT(1) DEFAULT 0 COMMENT 'Restrict to one submission per browser',

  -- Optional respondent fields
  `collect_name` TINYINT(1) DEFAULT 0 COMMENT 'Show optional name field',
  `collect_email` TINYINT(1) DEFAULT 0 COMMENT 'Show optional email field',

  -- Metadata
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,

  -- Indexes
  INDEX `idx_slug` (`slug`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_is_deleted` (`is_deleted`),

  -- Foreign keys
  CONSTRAINT `fk_feedback_form_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- 2. Feedback Questions - Questions for each form
-- ========================================
CREATE TABLE IF NOT EXISTS `feedback_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `form_id` INT NOT NULL,
  `question_order` INT NOT NULL COMMENT 'Order of question in form',
  `question_type` ENUM('short_text', 'paragraph', 'multiple_choice_single', 'multiple_choice_multi', 'star_rating') NOT NULL,
  `question_text` TEXT NOT NULL,
  `is_required` TINYINT(1) DEFAULT 0,
  `options` JSON DEFAULT NULL COMMENT 'For multiple choice: ["Option 1", "Option 2", ...]',

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_form_id` (`form_id`),
  INDEX `idx_question_order` (`form_id`, `question_order`),

  -- Foreign keys
  CONSTRAINT `fk_question_form` FOREIGN KEY (`form_id`) REFERENCES `feedback_forms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- 3. Feedback Responses - Form submissions
-- ========================================
CREATE TABLE IF NOT EXISTS `feedback_responses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `form_id` INT NOT NULL,
  `browser_fingerprint` VARCHAR(64) DEFAULT NULL COMMENT 'For one-per-browser check',
  `respondent_name` VARCHAR(255) DEFAULT NULL,
  `respondent_email` VARCHAR(255) DEFAULT NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) DEFAULT NULL,

  -- Indexes
  INDEX `idx_form_id` (`form_id`),
  INDEX `idx_browser_fingerprint` (`form_id`, `browser_fingerprint`),
  INDEX `idx_submitted_at` (`submitted_at`),

  -- Foreign keys
  CONSTRAINT `fk_response_form` FOREIGN KEY (`form_id`) REFERENCES `feedback_forms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- 4. Feedback Answers - Individual question answers
-- ========================================
CREATE TABLE IF NOT EXISTS `feedback_answers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `response_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `answer_text` TEXT DEFAULT NULL COMMENT 'For text responses',
  `answer_options` JSON DEFAULT NULL COMMENT 'For multiple choice: ["selected option"]',
  `answer_rating` INT DEFAULT NULL COMMENT 'For star rating (1-5)',

  -- Indexes
  INDEX `idx_response_id` (`response_id`),
  INDEX `idx_question_id` (`question_id`),

  -- Foreign keys
  CONSTRAINT `fk_answer_response` FOREIGN KEY (`response_id`) REFERENCES `feedback_responses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_answer_question` FOREIGN KEY (`question_id`) REFERENCES `feedback_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Feedback tables created successfully!' AS status;
