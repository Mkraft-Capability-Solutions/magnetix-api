-- ========================================
-- CREATE STUDENT CORPORATE INFORMATION TABLE
-- ========================================
-- Stores corporate/employment information for students/trainees
-- Linked to users table via user_id (UUID)
-- ========================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `student_corporate_info` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL UNIQUE COMMENT 'FK to users.uuid',

  -- Job Information
  `job_profile` VARCHAR(255) NULL COMMENT 'Job title/profile',
  `designation` VARCHAR(255) NULL COMMENT 'Official designation',
  `department` VARCHAR(255) NULL COMMENT 'Department name',
  `employee_id` VARCHAR(100) NULL COMMENT 'Employee/Staff ID',

  -- Organization Information
  `organization_name` VARCHAR(255) NULL COMMENT 'Company/Organization name',
  `location` VARCHAR(255) NULL COMMENT 'Office location/branch',

  -- Manager Information
  `manager_name` VARCHAR(255) NULL COMMENT 'Reporting manager name',
  `manager_email` VARCHAR(255) NULL COMMENT 'Manager email address',
  `manager_contact` VARCHAR(20) NULL COMMENT 'Manager phone number',

  -- Metadata
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Key Constraint
  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,

  -- Indexes for performance
  INDEX idx_user_id (`user_id`),
  INDEX idx_organization (`organization_name`),
  INDEX idx_employee_id (`employee_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Corporate/Employment information for student trainees';

SELECT 'student_corporate_info table created successfully!' AS status;
