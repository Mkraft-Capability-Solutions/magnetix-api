-- Migration: Create mentorship_sessions table
-- Description: Stores scheduled mentorship sessions between instructors and students
-- Created: 2025-01-10

CREATE TABLE IF NOT EXISTS `mentorship_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `instructor_id` VARCHAR(255) NOT NULL,
  `mentee_id` VARCHAR(255) NOT NULL,
  `session_date` DATE NOT NULL,
  `session_time` TIME NOT NULL,
  `topic` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `url` VARCHAR(1000),
  `duration` VARCHAR(50) DEFAULT '30 minutes',
  `status` ENUM('pending', 'scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  `created_by` VARCHAR(255),
  `created_by_role` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_instructor_id` (`instructor_id`),
  INDEX `idx_mentee_id` (`mentee_id`),
  INDEX `idx_session_date` (`session_date`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by` (`created_by`),

  CONSTRAINT `fk_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_mentee` FOREIGN KEY (`mentee_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some sample comments for documentation
COMMENT ON TABLE `mentorship_sessions` IS 'Stores scheduled mentorship sessions between instructors and students';
COMMENT ON COLUMN `mentorship_sessions`.`status` IS 'Session status: pending (requested by student), scheduled (confirmed), completed, cancelled';
COMMENT ON COLUMN `mentorship_sessions`.`created_by_role` IS 'Role of person who created the session: admin, instructor, or student';
