-- Admin User Logs Table
-- Records all admin actions performed on users

CREATE TABLE IF NOT EXISTS admin_user_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT 'UUID of the user being acted upon',
  admin_id VARCHAR(36) NOT NULL COMMENT 'UUID of the admin performing the action',
  action_type VARCHAR(50) NOT NULL COMMENT 'Type of action: update, status_change, password_reset, role_change, enroll, unenroll',
  action_description TEXT NOT NULL COMMENT 'Human-readable description of the action',
  old_value VARCHAR(255) DEFAULT NULL COMMENT 'Previous value (for updates)',
  new_value VARCHAR(255) DEFAULT NULL COMMENT 'New value (for updates)',
  additional_data JSON DEFAULT NULL COMMENT 'Additional metadata about the action',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_admin_id (admin_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
