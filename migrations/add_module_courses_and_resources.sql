-- ========================================
-- AI LEARNING PATH - MODULE COURSES & EXTERNAL RESOURCES
-- ========================================
-- Adds tables for linking platform courses and external
-- internet resources to AI learning path modules
-- ========================================

USE lms_db;

-- ========================================
-- TABLE 1: ai_learning_path_module_courses
-- ========================================
-- Links AI learning path modules to existing platform courses
-- ========================================
CREATE TABLE IF NOT EXISTS `ai_learning_path_module_courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `module_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `linked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`module_id`) REFERENCES `ai_learning_path_modules`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_module_course` (`module_id`, `course_id`),
  INDEX `idx_module` (`module_id`),
  INDEX `idx_course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE 2: ai_learning_path_module_external_resources
-- ========================================
-- Stores AI-suggested internet course resources linked to modules
-- ========================================
CREATE TABLE IF NOT EXISTS `ai_learning_path_module_external_resources` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `module_id` INT NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `platform` VARCHAR(100) NOT NULL,
  `url` VARCHAR(2048) NOT NULL,
  `description` TEXT,
  `estimated_duration` VARCHAR(50),
  `is_free` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`module_id`) REFERENCES `ai_learning_path_modules`(`id`) ON DELETE CASCADE,
  INDEX `idx_module` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'AI Learning Path module courses and external resources tables created successfully!' AS status;
