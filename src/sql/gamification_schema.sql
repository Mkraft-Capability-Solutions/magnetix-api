-- ========================================
-- GAMIFICATION SYSTEM DATABASE SCHEMA
-- ========================================
-- Creates tables for points, achievements, levels, and leaderboard
-- ========================================

USE lms_db;

-- ========================================
-- TABLE: user_points
-- Track total points, XP, level, and streaks per user
-- ========================================
CREATE TABLE IF NOT EXISTS `user_points` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `total_points` INT DEFAULT 0,
  `total_xp` INT DEFAULT 0,
  `current_level` INT DEFAULT 1,
  `current_streak` INT DEFAULT 0,
  `longest_streak` INT DEFAULT 0,
  `last_activity_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
  UNIQUE KEY `idx_user` (`user_id`),
  INDEX `idx_level` (`current_level`),
  INDEX `idx_points` (`total_points`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE: achievement_definitions
-- Master list of all available achievements
-- ========================================
CREATE TABLE IF NOT EXISTS `achievement_definitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `achievement_key` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('learning', 'mastery', 'social', 'consistency', 'milestone') NOT NULL,
  `badge_tier` ENUM('common', 'rare', 'epic') NOT NULL,
  `points_reward` INT DEFAULT 0,
  `xp_reward` INT DEFAULT 0,
  `unlock_criteria_type` VARCHAR(50) NOT NULL,
  `unlock_criteria_value` INT NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `icon_name` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_category` (`category`),
  INDEX `idx_tier` (`badge_tier`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE: user_achievements
-- Track which achievements users have unlocked and progress
-- ========================================
CREATE TABLE IF NOT EXISTS `user_achievements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `achievement_id` INT NOT NULL,
  `progress` INT DEFAULT 0,
  `total_required` INT NOT NULL,
  `is_unlocked` TINYINT(1) DEFAULT 0,
  `unlocked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
  FOREIGN KEY (`achievement_id`) REFERENCES `achievement_definitions`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `idx_user_achievement` (`user_id`, `achievement_id`),
  INDEX `idx_unlocked` (`is_unlocked`),
  INDEX `idx_user_unlocked` (`user_id`, `is_unlocked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE: point_transactions
-- Audit log of all point awards for transparency
-- ========================================
CREATE TABLE IF NOT EXISTS `point_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `points_earned` INT NOT NULL,
  `xp_earned` INT DEFAULT 0,
  `transaction_type` VARCHAR(50) NOT NULL,
  `reference_type` VARCHAR(50) NULL,
  `reference_id` INT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_type` (`transaction_type`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE: level_definitions
-- Define XP thresholds and names for each level
-- ========================================
CREATE TABLE IF NOT EXISTS `level_definitions` (
  `level` INT PRIMARY KEY,
  `xp_required` INT NOT NULL,
  `level_name` VARCHAR(50) NULL,
  `rewards` JSON NULL,

  UNIQUE KEY `idx_xp` (`xp_required`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Gamification schema tables created successfully!' AS status;
