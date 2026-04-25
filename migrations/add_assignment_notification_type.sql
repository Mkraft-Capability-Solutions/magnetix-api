-- =============================================
-- Add 'assignment' value to notifications.notification_type ENUM
-- =============================================

USE lms_db;

ALTER TABLE notifications
  MODIFY COLUMN notification_type
  ENUM('marketing','system','announcement','instructor','event','course','assignment')
  NOT NULL;

SELECT 'notification_type ENUM extended with assignment' AS status;
