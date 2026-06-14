-- Create user_login_log table to track user login activity
-- This is used for calculating login streaks and total login days

CREATE TABLE IF NOT EXISTS `user_login_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_uuid` VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `login_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_login` (`user_uuid`, `login_time`),
  KEY `idx_login_date` (`user_uuid`, `login_time`),
  KEY `idx_login_time` (`login_time`),
  CONSTRAINT `fk_user_login_log_users` FOREIGN KEY (`user_uuid`) REFERENCES `users` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks user login activity for streak calculation';
