-- ========================================
-- Support Tickets Table Migration
-- ========================================
-- Creates the main support tickets table for query submission system
-- ========================================

USE lms_db;

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_number` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Auto-generated unique ticket ID like TKT-20260104-0001',
  `user_id` VARCHAR(36) NOT NULL COMMENT 'User who created the ticket',
  `subject` VARCHAR(500) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('technical', 'account', 'billing', 'course', 'general') DEFAULT 'general',
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  `status` ENUM('open', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed') DEFAULT 'open',
  `assigned_to` VARCHAR(36) NULL COMMENT 'Support agent (admin) assigned to this ticket',
  `resolution_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL,
  `closed_at` TIMESTAMP NULL,

  -- Indexes for performance
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_assigned_to` (`assigned_to`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_ticket_number` (`ticket_number`),

  -- Foreign keys
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Support tickets table created successfully!' AS status;
