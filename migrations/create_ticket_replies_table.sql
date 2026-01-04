-- ========================================
-- Ticket Replies Table Migration
-- ========================================
-- Creates the ticket replies table for support ticket conversations
-- ========================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `user_id` VARCHAR(36) NOT NULL COMMENT 'Who replied (user or admin)',
  `user_type` ENUM('user', 'agent') NOT NULL,
  `message` TEXT NOT NULL,
  `is_internal` BOOLEAN DEFAULT FALSE COMMENT 'Internal notes only visible to admins',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX `idx_ticket_id` (`ticket_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`),

  -- Foreign keys
  CONSTRAINT `fk_reply_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reply_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Ticket replies table created successfully!' AS status;
