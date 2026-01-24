-- ============================================================================
-- CERTIFICATION ENROLLMENTS TABLE
-- ============================================================================
-- This table tracks which students are enrolled/working on which certifications
-- and their overall progress

CREATE TABLE IF NOT EXISTS `student_certification_enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL COMMENT 'Student UUID',
  `certification_id` INT NOT NULL COMMENT 'Reference to certifications table',
  `enrollment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When student started working on certification',
  `target_completion_date` DATE NULL COMMENT 'Target date for completion',
  `completion_date` TIMESTAMP NULL COMMENT 'When student completed all requirements',
  `certificate_issued_date` TIMESTAMP NULL COMMENT 'When certificate was issued',
  `certificate_file_path` VARCHAR(500) NULL COMMENT 'Path to generated certificate',
  `status` ENUM('in_progress', 'completed', 'expired', 'revoked') DEFAULT 'in_progress',
  `notes` TEXT NULL COMMENT 'Admin notes about this enrollment',
  `enrolled_by` VARCHAR(36) NULL COMMENT 'Admin who enrolled the student',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (`certification_id`) REFERENCES `certifications`(`id`) ON DELETE CASCADE,

  -- Indexes
  INDEX `idx_user_certification` (`user_id`, `certification_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_completion_date` (`completion_date`),

  -- Unique constraint: One enrollment per student per certification
  UNIQUE KEY `unique_user_certification` (`user_id`, `certification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Complex views will be handled through application queries
-- to avoid collation and performance issues
