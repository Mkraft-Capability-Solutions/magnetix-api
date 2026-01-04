-- ========================================
-- AI LEARNING PATHS DATABASE SCHEMA
-- ========================================
-- Creates tables for AI-generated learning paths system
-- Tables: ai_learning_paths, ai_learning_path_modules,
--         ai_learning_path_module_topics, ai_learning_path_skills
-- ========================================

USE lms_db;

-- ========================================
-- TABLE 1: ai_learning_paths
-- ========================================
-- Purpose: Store AI-generated learning paths for users
-- ========================================
CREATE TABLE IF NOT EXISTS `ai_learning_paths` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `type` ENUM('ai_generated', 'custom', 'recommended') DEFAULT 'ai_generated',
  `difficulty_level` ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  `total_modules` INT DEFAULT 0,
  `completed_modules` INT DEFAULT 0,
  `progress` DECIMAL(5,2) DEFAULT 0.00,
  `status` ENUM('not_started', 'in_progress', 'completed', 'archived') DEFAULT 'not_started',
  `estimated_duration_weeks` INT,
  `time_spent_hours` DECIMAL(10,2) DEFAULT 0.00,
  `last_accessed` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_user_progress` (`user_id`, `progress`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE 2: ai_learning_path_modules
-- ========================================
-- Purpose: Store individual modules within a learning path
-- ========================================
CREATE TABLE IF NOT EXISTS `ai_learning_path_modules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `learning_path_id` INT NOT NULL,
  `module_order` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `duration_weeks` INT,
  `status` ENUM('locked', 'unlocked', 'in_progress', 'completed') DEFAULT 'locked',
  `score` DECIMAL(5,2) NULL,
  `progress` DECIMAL(5,2) DEFAULT 0.00,
  `started_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`learning_path_id`) REFERENCES `ai_learning_paths`(`id`) ON DELETE CASCADE,
  INDEX `idx_path_order` (`learning_path_id`, `module_order`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE 3: ai_learning_path_module_topics
-- ========================================
-- Purpose: Store topics covered in each module
-- ========================================
CREATE TABLE IF NOT EXISTS `ai_learning_path_module_topics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `module_id` INT NOT NULL,
  `topic_name` VARCHAR(255) NOT NULL,
  `topic_order` INT NOT NULL,
  `is_completed` BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (`module_id`) REFERENCES `ai_learning_path_modules`(`id`) ON DELETE CASCADE,
  INDEX `idx_module` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE 4: ai_learning_path_skills
-- ========================================
-- Purpose: Track skills being developed through learning paths
-- ========================================
CREATE TABLE IF NOT EXISTS `ai_learning_path_skills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `skill_name` VARCHAR(100) NOT NULL,
  `skill_level` ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
  `mastery_percentage` DECIMAL(5,2) DEFAULT 0.00,
  `color` VARCHAR(7) DEFAULT '#2563eb',
  `learning_path_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
  FOREIGN KEY (`learning_path_id`) REFERENCES `ai_learning_paths`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_user_skill` (`user_id`, `skill_name`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'AI Learning Paths tables created successfully!' AS status;
