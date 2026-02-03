-- ========================================
-- USER CERTIFICATES MANAGEMENT TABLES
-- ========================================
-- Tables for admin to issue certificates directly to users
-- Independent from course-based certifications
-- ========================================

USE lxp_db;

-- ========================================
-- TABLE: certificate_templates
-- ========================================
-- Stores certificate templates for customization
-- ========================================

CREATE TABLE IF NOT EXISTS `certificate_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_name` VARCHAR(255) NOT NULL,
  `template_description` TEXT NULL,
  `template_file_path` VARCHAR(500) NOT NULL,
  `thumbnail_path` VARCHAR(500) NULL,
  `is_default` BOOLEAN DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_is_default (`is_default`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE: admin_issued_certificates
-- ========================================
-- Stores certificates issued by admin to users
-- ========================================

CREATE TABLE IF NOT EXISTS `admin_issued_certificates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `certificate_number` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique certificate number (auto-generated)',
  `certificate_name` VARCHAR(255) NOT NULL COMMENT 'Title of the certificate',
  `user_id` VARCHAR(36) NOT NULL COMMENT 'User receiving the certificate',
  `description` TEXT NULL COMMENT 'Achievement description',
  `issue_date` DATE NOT NULL COMMENT 'Date certificate was issued',
  `expiry_date` DATE NULL COMMENT 'Optional expiry date',
  `template_id` INT NULL COMMENT 'Reference to certificate template',
  `certificate_file_path` VARCHAR(500) NULL COMMENT 'Path to generated PDF certificate',
  `issued_by` VARCHAR(36) NOT NULL COMMENT 'Admin who issued the certificate',
  `status` ENUM('active', 'revoked', 'expired') DEFAULT 'active',
  `notes` TEXT NULL COMMENT 'Admin internal notes',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
  FOREIGN KEY (`issued_by`) REFERENCES `users`(`uuid`) ON DELETE RESTRICT,
  FOREIGN KEY (`template_id`) REFERENCES `certificate_templates`(`id`) ON DELETE SET NULL,

  INDEX idx_user (`user_id`),
  INDEX idx_certificate_number (`certificate_number`),
  INDEX idx_status (`status`),
  INDEX idx_issue_date (`issue_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- INSERT DEFAULT TEMPLATE
-- ========================================

INSERT INTO `certificate_templates`
  (`template_name`, `template_description`, `template_file_path`, `is_default`, `status`)
VALUES
  ('Default Certificate', 'Standard certificate template with company branding', '/templates/certificates/default-template.html', 1, 'active');

-- ========================================
-- INSERT SAMPLE CERTIFICATE
-- ========================================
-- Insert a sample certificate for testing
-- Note: Replace the UUIDs with actual user UUIDs from your database

-- Get a sample user UUID (you may need to adjust this)
SET @sample_user_uuid = (SELECT uuid FROM users WHERE role_id = 1 LIMIT 1);
SET @admin_uuid = (SELECT uuid FROM users WHERE role_id IN (3, 4) LIMIT 1);

-- Insert sample certificate only if users exist
INSERT INTO `admin_issued_certificates`
  (`certificate_number`, `certificate_name`, `user_id`, `description`, `issue_date`, `expiry_date`, `template_id`, `issued_by`, `status`, `notes`)
SELECT
  'CERT-2024-000001',
  'Certificate of Achievement',
  'c42e2441-f6bd-4856-a2c3-e64c7bfaa691',
  'For outstanding performance and dedication to continuous learning',
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
  1,
  'b151968d-727d-426c-bd83-51584862e617',
  'active',
  'Sample certificate for testing purposes'
WHERE @sample_user_uuid IS NOT NULL AND @admin_uuid IS NOT NULL;

SELECT 'User certificates tables created successfully!' AS status;


 ALTER TABLE admin_issued_certificates
  ADD COLUMN `certificate_title` VARCHAR(255) DEFAULT 'Certificate of Achievement' AFTER certificate_number;