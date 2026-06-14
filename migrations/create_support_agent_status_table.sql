-- ========================================
-- Support Agent Status Table Migration
-- ========================================
-- Creates the support agent status table for tracking agent availability
-- ========================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `support_agent_status` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(36) UNIQUE NOT NULL,
  `is_online` BOOLEAN DEFAULT FALSE,
  `status` ENUM('available', 'busy', 'away', 'offline') DEFAULT 'offline',
  `current_active_chats` INT DEFAULT 0,
  `max_concurrent_chats` INT DEFAULT 5 COMMENT 'Configurable per agent',
  `last_seen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX `idx_agent_id` (`agent_id`),
  INDEX `idx_is_online` (`is_online`),
  INDEX `idx_status` (`status`),

  -- Foreign keys
  CONSTRAINT `fk_agent_status` FOREIGN KEY (`agent_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Support agent status table created successfully!' AS status;
