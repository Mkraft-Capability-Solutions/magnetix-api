-- ============================================================================
-- MARKETING CAMPAIGNS SETUP
-- ============================================================================

USE magnetix_db;

-- ============================================================================
-- TABLE: marketing_campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  target_audience JSON NOT NULL,
  delivery_method ENUM('email', 'notification', 'in-app', 'both') DEFAULT 'notification',
  status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed') DEFAULT 'draft',
  recipient_count INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  scheduled_for DATETIME NULL,
  sent_at DATETIME NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_delivery_method (delivery_method),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_scheduled_for (scheduled_for)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================================
-- STORED PROCEDURE: sp_create_marketing_campaign
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_create_marketing_campaign;

DELIMITER $$

CREATE PROCEDURE sp_create_marketing_campaign(
  IN p_uuid VARCHAR(36),
  IN p_title VARCHAR(255),
  IN p_subject VARCHAR(255),
  IN p_message TEXT,
  IN p_target_audience JSON,
  IN p_delivery_method VARCHAR(20),
  IN p_scheduled_for DATETIME,
  IN p_created_by VARCHAR(36)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Insert the campaign
  INSERT INTO marketing_campaigns (
    uuid,
    title,
    subject,
    message,
    target_audience,
    delivery_method,
    scheduled_for,
    created_by,
    status
  ) VALUES (
    p_uuid,
    p_title,
    p_subject,
    p_message,
    p_target_audience,
    p_delivery_method,
    p_scheduled_for,
    p_created_by,
    -- 'scheduled' whenever a schedule is provided. We intentionally do NOT
    -- compare against NOW(): scheduled_for is stored as the IST wall-clock the
    -- user picked, while NOW() is the DB server timezone, so the comparison
    -- could mislabel a valid future time as 'draft'. The UI validates the time
    -- is in the future, and the scheduler decides "due" using IST.
    CASE
      WHEN p_scheduled_for IS NOT NULL THEN 'scheduled'
      ELSE 'draft'
    END
  );

  -- Return the created campaign
  SELECT
    mc.uuid,
    mc.id,
    mc.title,
    mc.subject,
    mc.message,
    mc.target_audience as targetAudience,
    mc.delivery_method as deliveryMethod,
    mc.status,
    mc.recipient_count as recipientCount,
    mc.total_sent as totalSent,
    mc.total_delivered as totalDelivered,
    mc.total_opened as totalOpened,
    mc.total_clicked as totalClicked,
    mc.scheduled_for as scheduledFor,
    mc.sent_at as sentAt,
    mc.created_at as createdAt,
    mc.updated_at as updatedAt,
    CONCAT(
      COALESCE(s.first_name, a.first_name, i.first_name, 'Unknown'),
      ' ',
      COALESCE(s.last_name, a.last_name, i.last_name, 'User')
    ) as createdByName
  FROM marketing_campaigns mc
  LEFT JOIN students s ON mc.created_by = s.user_id
  LEFT JOIN admins a ON mc.created_by = a.user_id
  LEFT JOIN instructors i ON mc.created_by = i.user_id
  WHERE mc.uuid = p_uuid;

  COMMIT;
END$$

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURE: sp_get_marketing_campaigns
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_get_marketing_campaigns;

DELIMITER $$

CREATE PROCEDURE sp_get_marketing_campaigns(
  IN p_search VARCHAR(255),
  IN p_status VARCHAR(20),
  IN p_delivery_method VARCHAR(20),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    mc.uuid,
    mc.id,
    mc.title,
    mc.subject,
    mc.message,
    mc.target_audience as targetAudience,
    mc.delivery_method as deliveryMethod,
    mc.status,
    mc.recipient_count as recipientCount,
    mc.total_sent as totalSent,
    mc.total_delivered as totalDelivered,
    mc.total_opened as totalOpened,
    mc.total_clicked as totalClicked,
    mc.scheduled_for as scheduledFor,
    mc.sent_at as sentAt,
    mc.created_at as createdAt,
    mc.updated_at as updatedAt,
    CONCAT(
      COALESCE(s.first_name, a.first_name, i.first_name, 'Unknown'),
      ' ',
      COALESCE(s.last_name, a.last_name, i.last_name, 'User')
    ) as createdByName
  FROM marketing_campaigns mc
  LEFT JOIN students s ON mc.created_by = s.user_id
  LEFT JOIN admins a ON mc.created_by = a.user_id
  LEFT JOIN instructors i ON mc.created_by = i.user_id
  WHERE mc.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR mc.title LIKE CONCAT('%', p_search, '%') OR mc.subject LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR mc.status = p_status)
    AND (p_delivery_method IS NULL OR p_delivery_method = '' OR mc.delivery_method = p_delivery_method)
  ORDER BY mc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END$$

DELIMITER ;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Note: For dummy data, run marketing_dummy_data.sql separately

-- Show table structure
DESCRIBE marketing_campaigns;

-- Show stored procedures
SHOW PROCEDURE STATUS WHERE Db = 'magnetix_db' AND Name LIKE 'sp_%marketing%';
