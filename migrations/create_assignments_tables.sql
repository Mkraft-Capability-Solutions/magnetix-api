-- =============================================
-- Assignments feature tables
-- Migration B
-- =============================================

USE lms_db;

-- =============================================
-- 1. assignments — top-level assignment entity
-- =============================================
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,

  -- Submission shape
  `type` ENUM('document','assessment') NOT NULL,
  `assessment_id` INT NULL COMMENT 'FK feedback_forms.id (when type=assessment)',
  `doc_instructions` TEXT NULL COMMENT 'Optional extra instructions (when type=document)',
  `allow_resubmission` TINYINT(1) DEFAULT 0,
  `max_file_size_mb` INT DEFAULT 25,
  `allowed_file_types` VARCHAR(255) DEFAULT 'pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,png',

  -- Scope
  `scope` ENUM('organization','team') NOT NULL,
  `organization_id` INT NULL,
  `team_id` INT NULL,

  -- Window
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,

  -- Audit
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,

  CONSTRAINT `fk_assignment_assessment`   FOREIGN KEY (`assessment_id`)   REFERENCES `feedback_forms` (`id`),
  CONSTRAINT `fk_assignment_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `fk_assignment_team`         FOREIGN KEY (`team_id`)         REFERENCES `teams` (`id`),
  CONSTRAINT `fk_assignment_created_by`   FOREIGN KEY (`created_by`)      REFERENCES `users` (`uuid`),

  INDEX `idx_assignments_team`   (`team_id`, `end_date`),
  INDEX `idx_assignments_org`    (`organization_id`, `end_date`),
  INDEX `idx_assignments_window` (`start_date`, `end_date`),
  INDEX `idx_assignments_creator` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- 2. assignment_submissions — one row per (assignment, user)
-- =============================================
CREATE TABLE IF NOT EXISTS `assignment_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `assignment_id` INT NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,

  `submission_type` ENUM('document','assessment') NOT NULL,
  -- document fields
  `file_url` VARCHAR(500) NULL,
  `file_name` VARCHAR(255) NULL,
  `file_size_bytes` BIGINT NULL,
  -- assessment fields
  `assessment_response_id` INT NULL COMMENT 'FK feedback_responses.id',

  `notes` TEXT NULL COMMENT 'Learner-supplied note',
  `status` ENUM('submitted','reviewed','rejected') DEFAULT 'submitted',

  -- Review
  `reviewed_by` VARCHAR(36) NULL,
  `reviewed_at` TIMESTAMP NULL,
  `feedback` TEXT NULL,

  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY `uniq_submission_assignment_user` (`assignment_id`, `user_id`),
  CONSTRAINT `fk_submission_assignment` FOREIGN KEY (`assignment_id`)         REFERENCES `assignments` (`id`)         ON DELETE CASCADE,
  CONSTRAINT `fk_submission_user`       FOREIGN KEY (`user_id`)               REFERENCES `users` (`uuid`)             ON DELETE CASCADE,
  CONSTRAINT `fk_submission_response`   FOREIGN KEY (`assessment_response_id`) REFERENCES `feedback_responses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_submission_reviewer`   FOREIGN KEY (`reviewed_by`)           REFERENCES `users` (`uuid`)             ON DELETE SET NULL,

  INDEX `idx_submission_user` (`user_id`, `submitted_at`),
  INDEX `idx_submission_assignment_status` (`assignment_id`, `status`, `submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================
-- 3. assignment_email_log — email idempotency
-- =============================================
CREATE TABLE IF NOT EXISTS `assignment_email_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `assignment_id` INT NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `email_type` ENUM(
    'created','reminder_48h','reminder_24h','missed_learner',
    'missed_escalation','submission_confirm','submission_received',
    'review_completed','manager_assigned'
  ) NOT NULL,
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `message_id` VARCHAR(255) NULL,

  UNIQUE KEY `uniq_email` (`assignment_id`, `user_id`, `email_type`),
  CONSTRAINT `fk_email_log_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  INDEX `idx_log_user` (`user_id`, `email_type`, `sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'assignments + assignment_submissions + assignment_email_log created' AS status;
