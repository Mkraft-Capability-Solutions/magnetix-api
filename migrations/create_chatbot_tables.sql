-- ================================================================
-- AI Chatbot Tables
-- ================================================================
-- Stores chatbot conversations and messages for the AI assistant
-- ================================================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `chatbot_conversations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) DEFAULT 'New Chat',
  `status` ENUM('active','closed','escalated') DEFAULT 'active',
  `ticket_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` DATETIME DEFAULT NULL,
  INDEX `idx_chatbot_conv_user_id` (`user_id`),
  INDEX `idx_chatbot_conv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chatbot_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` VARCHAR(36) NOT NULL,
  `role` ENUM('user','assistant','system') NOT NULL,
  `content` TEXT NOT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_chatbot_msg_conv_id` (`conversation_id`),
  INDEX `idx_chatbot_msg_created` (`created_at`),
  FOREIGN KEY (`conversation_id`) REFERENCES `chatbot_conversations`(`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'Chatbot tables created successfully!' AS status;
