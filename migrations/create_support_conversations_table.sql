-- ========================================
-- Support Conversations Table Migration
-- ========================================
-- Creates the support conversations table for live chat system
-- ========================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `support_conversations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` VARCHAR(100) UNIQUE NOT NULL COMMENT 'UUID for each conversation',
  `user_id` VARCHAR(36) NOT NULL COMMENT 'User who initiated the chat',
  `assigned_agent_id` VARCHAR(36) NULL COMMENT 'Admin assigned to handle this chat',
  `status` ENUM('waiting', 'active', 'closed') DEFAULT 'waiting',
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_message_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` TIMESTAMP NULL,
  `rating` TINYINT NULL COMMENT '1-5 star rating after chat ends',
  `feedback` TEXT NULL COMMENT 'User feedback after chat',

  -- Indexes for performance
  INDEX `idx_conversation_id` (`conversation_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_assigned_agent_id` (`assigned_agent_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_started_at` (`started_at`),

  -- Foreign keys
  CONSTRAINT `fk_conversation_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_conversation_agent` FOREIGN KEY (`assigned_agent_id`) REFERENCES `users` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Support conversations table created successfully!' AS status;
