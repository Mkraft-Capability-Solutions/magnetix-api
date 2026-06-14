-- ========================================
-- CERTIFICATION MANAGEMENT TABLES
-- ========================================
-- Tables for admin certification management system
-- Allows admins to create certifications and link them with required courses
-- ========================================

USE lxp_db;

-- ========================================
-- TABLE: certifications
-- ========================================
-- Stores certification programs created by admins
-- Each certification can have multiple course requirements
-- ========================================

CREATE TABLE IF NOT EXISTS `certifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `certification_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `validity_period` INT NULL COMMENT 'Validity period in days',
  `validity_type` ENUM('lifetime', 'limited') DEFAULT 'lifetime',
  `template_file_path` VARCHAR(500) NULL COMMENT 'Path to certificate template file (PDF/image)',
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_by` VARCHAR(36) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`created_by`) REFERENCES `users`(`uuid`) ON DELETE RESTRICT,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`uuid`) ON DELETE RESTRICT,
  INDEX idx_status (`status`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE: certification_course_requirements
-- ========================================
-- Links certifications with required courses
-- Many-to-many relationship between certifications and courses
-- ========================================

CREATE TABLE IF NOT EXISTS `certification_course_requirements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `certification_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`certification_id`) REFERENCES `certifications`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE CASCADE,
  UNIQUE KEY unique_cert_course (`certification_id`, `course_id`),
  INDEX idx_certification (`certification_id`),
  INDEX idx_course (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Certification management tables created successfully!' AS status;
