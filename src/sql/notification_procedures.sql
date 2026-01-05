-- Get user notifications with pagination and filters
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_user_notifications(
  IN p_user_id VARCHAR(36),
  IN p_limit INT,
  IN p_offset INT,
  IN p_type VARCHAR(50),
  IN p_is_read TINYINT
)
BEGIN
  SELECT
    n.uuid,
    n.title,
    n.message,
    n.notification_type,
    n.icon,
    n.action_url,
    n.is_read,
    n.created_at,
    n.metadata
  FROM notifications n
  WHERE n.recipient_id = p_user_id
    AND n.is_deleted = 0
    AND (p_type IS NULL OR p_type = '' OR n.notification_type = p_type)
    AND (p_is_read IS NULL OR n.is_read = p_is_read)
  ORDER BY n.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END //
DELIMITER ;

-- Get unread notification count for user
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_unread_count(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT COUNT(*) as unread_count
  FROM notifications
  WHERE recipient_id = p_user_id
    AND is_read = 0
    AND is_deleted = 0;
END //
DELIMITER ;

-- Mark single notification as read
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_mark_notification_read(
  IN p_notification_uuid VARCHAR(36),
  IN p_user_id VARCHAR(36)
)
BEGIN
  UPDATE notifications
  SET is_read = 1, read_at = NOW()
  WHERE uuid = p_notification_uuid
    AND recipient_id = p_user_id
    AND is_read = 0;

  SELECT ROW_COUNT() as affected_rows;
END //
DELIMITER ;

-- Mark all notifications as read for user
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_mark_all_read(
  IN p_user_id VARCHAR(36)
)
BEGIN
  UPDATE notifications
  SET is_read = 1, read_at = NOW()
  WHERE recipient_id = p_user_id
    AND is_read = 0
    AND is_deleted = 0;

  SELECT ROW_COUNT() as affected_rows;
END //
DELIMITER ;

-- Create marketing campaign
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_create_marketing_campaign(
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
  INSERT INTO marketing_campaigns (
    uuid, title, subject, message, target_audience,
    delivery_method, scheduled_for, created_by, status
  ) VALUES (
    p_uuid, p_title, p_subject, p_message, p_target_audience,
    p_delivery_method, p_scheduled_for, p_created_by,
    IF(p_scheduled_for IS NULL OR p_scheduled_for <= NOW(), 'draft', 'scheduled')
  );

  SELECT uuid, id FROM marketing_campaigns WHERE uuid = p_uuid;
END //
DELIMITER ;

-- Get marketing campaigns with pagination and filters
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_marketing_campaigns(
  IN p_search VARCHAR(255),
  IN p_status VARCHAR(20),
  IN p_delivery_method VARCHAR(20),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    mc.uuid,
    mc.title,
    mc.subject,
    mc.message,
    mc.target_audience,
    mc.delivery_method,
    mc.status,
    mc.recipient_count,
    mc.total_sent,
    mc.total_delivered,
    mc.total_opened,
    mc.total_clicked,
    mc.scheduled_for,
    mc.sent_at,
    mc.created_at,
    CONCAT(u.first_name, ' ', u.last_name) as created_by_name
  FROM marketing_campaigns mc
  LEFT JOIN users u ON mc.created_by = u.uuid
  WHERE mc.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR mc.title LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR mc.status = p_status)
    AND (p_delivery_method IS NULL OR p_delivery_method = '' OR mc.delivery_method = p_delivery_method)
  ORDER BY mc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END //
DELIMITER ;

SELECT 'Notification stored procedures created successfully!' as status;
