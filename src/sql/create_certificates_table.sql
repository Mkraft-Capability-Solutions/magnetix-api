-- ========================================
-- TABLE: student_certificates
-- ========================================
-- Stores student-uploaded certificates with approval workflow
-- ========================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `student_certificates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `certificate_name` VARCHAR(255) NOT NULL,
  `organization` VARCHAR(255) NOT NULL,
  `issue_date` DATE NOT NULL,
  `expiry_date` DATE NULL,
  `credential_id` VARCHAR(255) NULL,
  `certificate_link` VARCHAR(500) NULL,
  `file_path` VARCHAR(500) NULL,
  `logo_path` VARCHAR(500) NULL,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `issued_by_org` BOOLEAN DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
  INDEX idx_user_status (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'student_certificates table created successfully!' AS status;
