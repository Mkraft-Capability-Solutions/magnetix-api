-- ========================================
-- Support Messages Table Migration
-- ========================================
-- Creates the support messages table for storing chat messages
-- ========================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `support_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` VARCHAR(100) UNIQUE NOT NULL COMMENT 'UUID for each message',
  `conversation_id` VARCHAR(100) NOT NULL COMMENT 'Links to support_conversations',
  `sender_id` VARCHAR(36) NOT NULL COMMENT 'User or admin who sent the message',
  `sender_type` ENUM('user', 'agent') NOT NULL COMMENT 'Distinguish between user and support agent',
  `message_type` ENUM('text', 'file', 'image', 'system') DEFAULT 'text',
  `content` TEXT NULL COMMENT 'Text content of the message',
  `file_url` VARCHAR(1000) NULL COMMENT 'URL of uploaded file/image',
  `file_name` VARCHAR(500) NULL COMMENT 'Original file name',
  `file_size` INT NULL COMMENT 'File size in bytes',
  `file_type` VARCHAR(100) NULL COMMENT 'MIME type',
  `is_read` BOOLEAN DEFAULT FALSE COMMENT 'Track if message has been read',
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX `idx_message_id` (`message_id`),
  INDEX `idx_conversation_id` (`conversation_id`),
  INDEX `idx_sender_id` (`sender_id`),
  INDEX `idx_sent_at` (`sent_at`),

  -- Foreign keys
  CONSTRAINT `fk_message_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `support_conversations` (`conversation_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Support messages table created successfully!' AS status;
