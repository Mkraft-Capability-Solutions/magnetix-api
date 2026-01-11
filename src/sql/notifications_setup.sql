-- ============================================================================
-- NOTIFICATIONS SETUP
-- ============================================================================

USE magnetix_db;

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('marketing', 'system', 'announcement', 'instructor', 'event', 'course') DEFAULT 'system',
  icon VARCHAR(50) DEFAULT 'bell',
  action_url VARCHAR(500) NULL,
  recipient_id VARCHAR(36) NOT NULL,
  delivery_method VARCHAR(50) DEFAULT 'in-app',
  campaign_id INT NULL,
  metadata JSON NULL,
  is_read TINYINT(1) DEFAULT 0,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  deleted_at DATETIME NULL,
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_notification_type (notification_type),
  INDEX idx_is_read (is_read),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_created_at (created_at),
  INDEX idx_campaign_id (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================================
-- TABLE: email_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NULL,
  campaign_id INT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
  sent_at DATETIME NULL,
  failed_at DATETIME NULL,
  error_message TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notification_id (notification_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_status (status),
  INDEX idx_recipient_email (recipient_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================================
-- STORED PROCEDURE: sp_get_user_notifications
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_get_user_notifications;

DELIMITER $$

CREATE PROCEDURE sp_get_user_notifications(
  IN p_user_id VARCHAR(36),
  IN p_limit INT,
  IN p_offset INT,
  IN p_type VARCHAR(50),
  IN p_is_read TINYINT(1)
)
BEGIN
  SELECT
    uuid,
    title,
    message,
    notification_type,
    icon,
    action_url,
    is_read,
    created_at,
    metadata
  FROM notifications
  WHERE recipient_id = p_user_id
    AND is_deleted = 0
    AND (p_type IS NULL OR p_type = '' OR notification_type = p_type)
    AND (p_is_read IS NULL OR is_read = p_is_read)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END$$

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURE: sp_get_unread_count
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_get_unread_count;

DELIMITER $$

CREATE PROCEDURE sp_get_unread_count(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT COUNT(*) as unread_count
  FROM notifications
  WHERE recipient_id = p_user_id
    AND is_read = 0
    AND is_deleted = 0;
END$$

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURE: sp_mark_notification_read
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_mark_notification_read;

DELIMITER $$

CREATE PROCEDURE sp_mark_notification_read(
  IN p_notification_uuid VARCHAR(36),
  IN p_user_id VARCHAR(36)
)
BEGIN
  UPDATE notifications
  SET is_read = 1, read_at = NOW()
  WHERE uuid = p_notification_uuid
    AND recipient_id = p_user_id
    AND is_deleted = 0;

  SELECT ROW_COUNT() as affected_rows;
END$$

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURE: sp_mark_all_read
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_mark_all_read;

DELIMITER $$

CREATE PROCEDURE sp_mark_all_read(
  IN p_user_id VARCHAR(36)
)
BEGIN
  UPDATE notifications
  SET is_read = 1, read_at = NOW()
  WHERE recipient_id = p_user_id
    AND is_read = 0
    AND is_deleted = 0;

  SELECT ROW_COUNT() as affected_rows;
END$$

DELIMITER ;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show table structures
DESCRIBE notifications;
DESCRIBE email_logs;

-- Show stored procedures
SHOW PROCEDURE STATUS WHERE Db = 'magnetix_db' AND Name LIKE 'sp_%notification%';
SHOW PROCEDURE STATUS WHERE Db = 'magnetix_db' AND Name LIKE 'sp_%read%';
