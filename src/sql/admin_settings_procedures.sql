-- =====================================================
-- Admin Settings - Table, Stored Procedures & Default Data
-- Database: lms_db
-- =====================================================

-- =====================================================
-- DROP EXISTING OBJECTS (if any)
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_admin_settings;
DROP PROCEDURE IF EXISTS sp_update_admin_settings;
DROP PROCEDURE IF EXISTS sp_get_storage_stats;
DROP TABLE IF EXISTS admin_settings;

-- =====================================================
-- TABLE: admin_settings (key-value store for settings)
-- =====================================================
CREATE TABLE admin_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  category ENUM('general', 'security', 'users', 'email', 'notifications', 'branding') NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- STORED PROCEDURE 1: sp_get_admin_settings
-- Returns all settings or by category
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_admin_settings(
  IN p_category VARCHAR(50)
)
BEGIN
  IF p_category IS NULL OR p_category = '' THEN
    SELECT
      setting_key,
      setting_value,
      setting_type,
      category,
      description
    FROM admin_settings
    ORDER BY category, setting_key;
  ELSE
    SELECT
      setting_key,
      setting_value,
      setting_type,
      category,
      description
    FROM admin_settings
    WHERE category = p_category
    ORDER BY setting_key;
  END IF;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 2: sp_update_admin_settings
-- Updates a single setting by key
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_update_admin_settings(
  IN p_setting_key VARCHAR(100),
  IN p_setting_value TEXT
)
BEGIN
  DECLARE v_exists INT DEFAULT 0;

  -- Check if setting exists
  SELECT COUNT(*) INTO v_exists
  FROM admin_settings
  WHERE setting_key = p_setting_key;

  IF v_exists > 0 THEN
    UPDATE admin_settings
    SET setting_value = p_setting_value,
        updated_at = NOW()
    WHERE setting_key = p_setting_key;

    SELECT TRUE as success, 'Setting updated successfully' as message;
  ELSE
    SELECT FALSE as success, 'Setting not found' as message;
  END IF;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 3: sp_get_storage_stats
-- Returns storage statistics
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_storage_stats()
BEGIN
  DECLARE v_total_courses INT DEFAULT 0;
  DECLARE v_total_users INT DEFAULT 0;
  DECLARE v_total_files INT DEFAULT 0;

  -- Count courses
  SELECT COUNT(*) INTO v_total_courses FROM course WHERE is_deleted = 0;

  -- Count users
  SELECT COUNT(*) INTO v_total_users FROM users WHERE is_deleted = 0;

  -- Estimate storage (simulated values based on data counts)
  -- In production, you would calculate actual file sizes
  SELECT
    100 as totalStorageGB,
    ROUND(v_total_courses * 0.5 + v_total_users * 0.02 + 10, 1) as usedStorageGB,
    ROUND(v_total_courses * 0.4, 1) as courseMaterialsGB,
    ROUND(v_total_users * 0.02, 1) as userDataGB,
    5.5 as backupsGB,
    v_total_courses as totalCourses,
    v_total_users as totalUsers;
END //

DELIMITER ;

-- =====================================================
-- INSERT DEFAULT SETTINGS
-- =====================================================

-- General Settings (4)
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description) VALUES
('org_name', 'My Organization', 'string', 'general', 'Organization name'),
('time_zone', 'Asia/Kolkata', 'string', 'general', 'Default timezone'),
('language', 'en', 'string', 'general', 'Default language'),
('date_format', 'DD-MM-YYYY', 'string', 'general', 'Date display format');

-- Security Settings (4)
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description) VALUES
('two_factor_auth', 'true', 'boolean', 'security', 'Enable two-factor authentication'),
('password_expiry_days', '90', 'number', 'security', 'Password expiry in days'),
('session_timeout_minutes', '30', 'number', 'security', 'Session timeout in minutes'),
('ip_whitelist', '', 'string', 'security', 'Comma-separated IP whitelist');

-- User Management Settings (4)
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description) VALUES
('allow_self_registration', 'false', 'boolean', 'users', 'Allow users to self-register'),
('require_email_verification', 'true', 'boolean', 'users', 'Require email verification'),
('default_user_role', 'trainee', 'string', 'users', 'Default role for new users'),
('max_users', '5000', 'number', 'users', 'Maximum allowed users');

-- Email Configuration (4)
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description) VALUES
('smtp_server', 'smtp.company.com', 'string', 'email', 'SMTP server address'),
('smtp_port', '587', 'number', 'email', 'SMTP server port'),
('from_email', 'noreply@company.com', 'string', 'email', 'From email address'),
('from_name', 'LMS Admin', 'string', 'email', 'From name for emails');

-- Notification Preferences (5)
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description) VALUES
('email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications'),
('course_updates', 'true', 'boolean', 'notifications', 'Notify on course updates'),
('user_activity', 'false', 'boolean', 'notifications', 'Notify on user activity'),
('system_alerts', 'true', 'boolean', 'notifications', 'Enable system alerts'),
('weekly_reports', 'true', 'boolean', 'notifications', 'Send weekly reports');

-- Appearance & Branding (4)
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description) VALUES
('theme_mode', 'light', 'string', 'branding', 'Theme mode (light/dark/auto)'),
('primary_color', '#10B981', 'string', 'branding', 'Primary brand color'),
('logo_url', '', 'string', 'branding', 'Company logo URL'),
('favicon_url', '', 'string', 'branding', 'Favicon URL');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- SELECT * FROM admin_settings ORDER BY category, setting_key;
-- CALL sp_get_admin_settings(NULL);
-- CALL sp_get_admin_settings('general');
-- CALL sp_get_storage_stats();
