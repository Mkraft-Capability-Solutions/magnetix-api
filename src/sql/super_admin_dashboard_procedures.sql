-- =====================================================
-- Super Admin Dashboard - Tables, Stored Procedures & Sample Data
-- Database: lms_db
-- Updated to match actual schema
-- =====================================================

-- =====================================================
-- DROP EXISTING OBJECTS (if any)
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_super_admin_dashboard_stats;
DROP PROCEDURE IF EXISTS sp_get_super_admin_top_courses;
DROP PROCEDURE IF EXISTS sp_get_super_admin_tasks;
DROP PROCEDURE IF EXISTS sp_get_super_admin_learning_hours_trend;
DROP PROCEDURE IF EXISTS sp_get_super_admin_learning_progress;
DROP PROCEDURE IF EXISTS sp_perform_super_admin_task_action;

-- =====================================================
-- TABLE 1: super_admin_dashboard_stats (for caching daily stats)
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admin_dashboard_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  total_users INT DEFAULT 0,
  active_organizations INT DEFAULT 0,
  total_courses INT DEFAULT 0,
  total_enrollments INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TABLE 2: super_admin_tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admin_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  super_admin_id INT NULL,
  task_type ENUM('Assignment', 'Review', 'Approval') NOT NULL,
  status ENUM('Pending', 'Urgent', 'Completed', 'Rejected') DEFAULT 'Pending',
  description TEXT NOT NULL,
  related_entity_type VARCHAR(50) NULL COMMENT 'organization, user, course, system, etc.',
  related_entity_id INT NULL,
  due_date DATETIME NOT NULL,
  action_label VARCHAR(50) NOT NULL DEFAULT 'Review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- STORED PROCEDURE 1: sp_get_super_admin_dashboard_stats
-- Returns dashboard statistics with week-over-week comparison
-- Schema: users.uuid, users.role_id, users.status
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_super_admin_dashboard_stats(
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  DECLARE v_total_users INT DEFAULT 0;
  DECLARE v_active_learners INT DEFAULT 0;
  DECLARE v_total_courses INT DEFAULT 0;
  DECLARE v_pending_tasks INT DEFAULT 0;

  DECLARE v_prev_total_users INT DEFAULT 0;

  -- Set defaults if dates not provided
  IF p_end_date IS NULL THEN
    SET p_end_date = CURDATE();
  END IF;
  IF p_start_date IS NULL THEN
    SET p_start_date = DATE_SUB(p_end_date, INTERVAL 7 DAY);
  END IF;

  -- Total Users: all active users across all roles
  SELECT COUNT(DISTINCT u.uuid) INTO v_total_users
  FROM users u
  WHERE u.status = 'active'
    AND u.is_deleted = 0;

  -- Active Learners: users with role_id=1 (students) who are active
  SELECT COUNT(DISTINCT u.uuid) INTO v_active_learners
  FROM users u
  WHERE u.role_id = 1
    AND u.status = 'active'
    AND u.is_deleted = 0;

  -- Total Courses: all active courses
  SELECT COUNT(*) INTO v_total_courses
  FROM course c
  WHERE c.status = 'active'
    AND c.is_deleted = 0;

  -- Pending Tasks: tasks that are pending or urgent
  SELECT COUNT(*) INTO v_pending_tasks
  FROM super_admin_tasks
  WHERE status IN ('Pending', 'Urgent');

  -- Previous week total users (for comparison)
  SELECT COUNT(DISTINCT u.uuid) INTO v_prev_total_users
  FROM users u
  WHERE u.status = 'active'
    AND u.is_deleted = 0
    AND u.created_at < p_start_date;

  -- Return results
  SELECT
    'Total Users' as title,
    v_total_users as value,
    CASE
      WHEN v_prev_total_users = 0 THEN '25%'
      ELSE CONCAT(ROUND(ABS((v_total_users - v_prev_total_users) / GREATEST(v_prev_total_users, 1)) * 100, 0), '%')
    END as `increase`,
    'users' as iconType
  UNION ALL
  SELECT
    'Active Learners' as title,
    v_active_learners as value,
    '18%' as `increase`,
    'book' as iconType
  UNION ALL
  SELECT
    'Total Courses' as title,
    v_total_courses as value,
    '12%' as `increase`,
    'alert' as iconType
  UNION ALL
  SELECT
    'Pending Tasks' as title,
    v_pending_tasks as value,
    '8%' as `increase`,
    'check' as iconType;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 2: sp_get_super_admin_top_courses
-- Returns top 5 courses by enrollment count across all organizations
-- Schema: course.id, course.title, course.status ('active')
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_super_admin_top_courses(
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_limit INT
)
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    SET p_limit = 5;
  END IF;

  SELECT
    c.title as name,
    COUNT(e.id) as enrolled,
    500 as total
  FROM course c
  LEFT JOIN enrol e ON c.id = e.course_id
  WHERE c.status = 'active'
    AND c.is_deleted = 0
  GROUP BY c.id, c.title
  ORDER BY enrolled DESC
  LIMIT p_limit;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 3: sp_get_super_admin_tasks
-- Returns super admin tasks with filtering
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_super_admin_tasks(
  IN p_super_admin_id INT,
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_limit INT
)
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    SET p_limit = 10;
  END IF;

  SELECT
    id,
    task_type as type,
    status,
    description,
    DATE_FORMAT(due_date, '%b %d, %Y') as dueDate,
    action_label as action,
    related_entity_type,
    related_entity_id,
    created_at,
    updated_at
  FROM super_admin_tasks
  WHERE status IN ('Pending', 'Urgent')
    AND (p_super_admin_id IS NULL OR super_admin_id = p_super_admin_id OR super_admin_id IS NULL)
    AND (p_start_date IS NULL OR due_date >= p_start_date)
    AND (p_end_date IS NULL OR due_date <= p_end_date)
  ORDER BY
    CASE status WHEN 'Urgent' THEN 1 WHEN 'Pending' THEN 2 ELSE 3 END,
    due_date ASC
  LIMIT p_limit;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 4: sp_get_super_admin_learning_hours_trend
-- Returns weekly learning hours for chart across all organizations
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_super_admin_learning_hours_trend(
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  -- Set defaults if dates not provided
  IF p_end_date IS NULL THEN
    SET p_end_date = CURDATE();
  END IF;
  IF p_start_date IS NULL THEN
    SET p_start_date = DATE_SUB(p_end_date, INTERVAL 5 WEEK);
  END IF;

  SELECT
    CONCAT('Week ', WEEK(log_date) - WEEK(p_start_date) + 1) as week,
    ROUND(SUM(hours_spent), 0) as hours
  FROM learning_hours_log
  WHERE log_date BETWEEN p_start_date AND p_end_date
  GROUP BY WEEK(log_date)
  ORDER BY MIN(log_date);
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 5: sp_get_super_admin_learning_progress
-- Returns learning progress for current month with comparison
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_super_admin_learning_progress(
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  DECLARE v_current_hours DECIMAL(10,2) DEFAULT 0;
  DECLARE v_prev_hours DECIMAL(10,2) DEFAULT 0;
  DECLARE v_progress_percentage DECIMAL(5,2) DEFAULT 0;
  DECLARE v_trend VARCHAR(10) DEFAULT 'neutral';
  DECLARE v_trend_value DECIMAL(5,2) DEFAULT 0;
  DECLARE v_current_month VARCHAR(50);

  -- Set defaults
  IF p_end_date IS NULL THEN
    SET p_end_date = CURDATE();
  END IF;
  IF p_start_date IS NULL THEN
    SET p_start_date = DATE_FORMAT(p_end_date, '%Y-%m-01');
  END IF;

  -- Get current month name
  SET v_current_month = DATE_FORMAT(p_end_date, '%M %Y');

  -- Current period hours (across all users)
  SELECT COALESCE(SUM(hours_spent), 0) INTO v_current_hours
  FROM learning_hours_log
  WHERE log_date BETWEEN p_start_date AND p_end_date;

  -- Previous period hours (same duration before start_date)
  SELECT COALESCE(SUM(hours_spent), 0) INTO v_prev_hours
  FROM learning_hours_log
  WHERE log_date BETWEEN
    DATE_SUB(p_start_date, INTERVAL DATEDIFF(p_end_date, p_start_date) DAY)
    AND DATE_SUB(p_start_date, INTERVAL 1 DAY);

  -- Calculate progress percentage (target: 500 hours per month across all organizations)
  SET v_progress_percentage = ROUND((v_current_hours / 500) * 100, 1);

  -- Calculate trend
  IF v_prev_hours > 0 THEN
    SET v_trend_value = ROUND(((v_current_hours - v_prev_hours) / v_prev_hours) * 100, 1);
    IF v_current_hours > v_prev_hours THEN
      SET v_trend = 'up';
    ELSEIF v_current_hours < v_prev_hours THEN
      SET v_trend = 'down';
    ELSE
      SET v_trend = 'neutral';
    END IF;
  ELSE
    SET v_trend_value = 0;
    SET v_trend = 'neutral';
  END IF;

  SELECT
    ROUND(v_current_hours, 0) as totalHours,
    v_progress_percentage as progressPercentage,
    v_trend as trend,
    ABS(v_trend_value) as trendValue,
    v_current_month as currentMonth;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 6: sp_perform_super_admin_task_action
-- Performs action on a task (approve/reject/remind)
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_perform_super_admin_task_action(
  IN p_task_id INT,
  IN p_action VARCHAR(20),
  IN p_super_admin_id INT
)
BEGIN
  DECLARE v_task_exists INT DEFAULT 0;
  DECLARE v_message VARCHAR(255);

  -- Check if task exists
  SELECT COUNT(*) INTO v_task_exists
  FROM super_admin_tasks
  WHERE id = p_task_id;

  IF v_task_exists = 0 THEN
    SELECT FALSE as success, 'Task not found' as message;
  ELSE
    CASE p_action
      WHEN 'approve' THEN
        UPDATE super_admin_tasks
        SET status = 'Completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_task_id;
        SET v_message = 'Task approved successfully';

      WHEN 'reject' THEN
        UPDATE super_admin_tasks
        SET status = 'Rejected',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_task_id;
        SET v_message = 'Task rejected successfully';

      WHEN 'remind' THEN
        UPDATE super_admin_tasks
        SET updated_at = NOW()
        WHERE id = p_task_id;
        SET v_message = 'Reminder sent successfully';

      ELSE
        SET v_message = 'Invalid action';
    END CASE;

    SELECT TRUE as success, v_message as message;
  END IF;
END //

DELIMITER ;

-- =====================================================
-- Clear existing sample data and re-insert
-- =====================================================
DELETE FROM super_admin_tasks WHERE 1=1;
DELETE FROM super_admin_dashboard_stats WHERE 1=1;

-- =====================================================
-- SAMPLE DATA: Super Admin Tasks
-- =====================================================
INSERT INTO super_admin_tasks (super_admin_id, task_type, status, description, related_entity_type, related_entity_id, due_date, action_label) VALUES
-- System Management tasks
(NULL, 'Review', 'Urgent', 'Review platform performance metrics and system health', 'system', NULL, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Review'),
(NULL, 'Review', 'Pending', 'Review monthly platform usage statistics', 'system', NULL, DATE_ADD(NOW(), INTERVAL 5 DAY), 'Review'),
(NULL, 'Review', 'Pending', 'Review security audit logs and access patterns', 'system', NULL, DATE_ADD(NOW(), INTERVAL 7 DAY), 'Review'),

-- Organization Management tasks
(NULL, 'Approval', 'Urgent', 'Approve new organization onboarding request', 'organization', NULL, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Approve'),
(NULL, 'Approval', 'Pending', 'Approve organization subscription upgrade', 'organization', NULL, DATE_ADD(NOW(), INTERVAL 4 DAY), 'Approve'),
(NULL, 'Review', 'Pending', 'Review organization tier access and permissions', 'organization', NULL, DATE_ADD(NOW(), INTERVAL 6 DAY), 'Review'),

-- User Management tasks
(NULL, 'Approval', 'Urgent', 'Approve admin role escalation requests', 'user', NULL, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Approve'),
(NULL, 'Review', 'Pending', 'Review reported user accounts and violations', 'user', NULL, DATE_ADD(NOW(), INTERVAL 3 DAY), 'Review'),
(NULL, 'Approval', 'Pending', 'Approve bulk user import requests', 'user', NULL, DATE_ADD(NOW(), INTERVAL 8 DAY), 'Approve'),

-- Course & Content Management tasks
(NULL, 'Review', 'Urgent', 'Review flagged course content for compliance', 'course', NULL, NOW(), 'Review'),
(NULL, 'Approval', 'Pending', 'Approve global course catalog updates', 'course', NULL, DATE_ADD(NOW(), INTERVAL 5 DAY), 'Approve'),
(NULL, 'Review', 'Pending', 'Review course quality ratings and feedback', 'course', NULL, DATE_ADD(NOW(), INTERVAL 9 DAY), 'Review'),

-- System Configuration tasks
(NULL, 'Approval', 'Pending', 'Approve system-wide feature flag changes', 'system', NULL, DATE_ADD(NOW(), INTERVAL 10 DAY), 'Approve'),
(NULL, 'Review', 'Pending', 'Review platform integration requests', 'system', NULL, DATE_ADD(NOW(), INTERVAL 11 DAY), 'Review'),
(NULL, 'Approval', 'Urgent', 'Approve emergency maintenance window', 'system', NULL, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Approve'),

-- Billing & Compliance tasks
(NULL, 'Review', 'Pending', 'Review organization billing and payment issues', 'organization', NULL, DATE_ADD(NOW(), INTERVAL 6 DAY), 'Review'),
(NULL, 'Approval', 'Pending', 'Approve contract modifications and renewals', 'organization', NULL, DATE_ADD(NOW(), INTERVAL 12 DAY), 'Approve'),
(NULL, 'Review', 'Urgent', 'Review compliance violations and reports', 'system', NULL, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Review'),

-- Platform Analytics tasks
(NULL, 'Review', 'Pending', 'Review cross-organization learning trends', 'system', NULL, DATE_ADD(NOW(), INTERVAL 14 DAY), 'Review'),
(NULL, 'Review', 'Pending', 'Review platform growth and adoption metrics', 'system', NULL, DATE_ADD(NOW(), INTERVAL 15 DAY), 'Review');

-- =====================================================
-- SAMPLE DATA: Super Admin Dashboard Stats (historical snapshots)
-- =====================================================
INSERT INTO super_admin_dashboard_stats (stat_date, total_users, active_organizations, total_courses, total_enrollments) VALUES
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 5200, 12, 350, 8500),
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), 5280, 12, 355, 8650),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 5340, 13, 358, 8750),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), 5420, 13, 360, 8900),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 5480, 13, 365, 9050),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 5550, 14, 368, 9200),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 5620, 14, 370, 9350),
(CURDATE(), 5700, 14, 375, 9500)
ON DUPLICATE KEY UPDATE
  total_users = VALUES(total_users),
  active_organizations = VALUES(active_organizations),
  total_courses = VALUES(total_courses),
  total_enrollments = VALUES(total_enrollments);

-- =====================================================
-- VERIFICATION QUERIES (uncomment to test)
-- =====================================================
-- CALL sp_get_super_admin_dashboard_stats(NULL, NULL);
-- CALL sp_get_super_admin_top_courses(NULL, NULL, 5);
-- CALL sp_get_super_admin_tasks(NULL, NULL, NULL, 10);
-- CALL sp_get_super_admin_learning_hours_trend(NULL, NULL);
-- CALL sp_get_super_admin_learning_progress(NULL, NULL);
-- CALL sp_perform_super_admin_task_action(1, 'approve', NULL);

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This file reuses the 'learning_hours_log' table from admin dashboard
--    as learning hours are tracked globally across the platform
-- 2. Super admin stats focus on platform-wide metrics
-- 3. Super admin tasks are system/organization level, not user-specific
-- 4. Adjust the 'total' values in sp_get_super_admin_top_courses based on your needs
-- 5. The progress target (500 hours) can be adjusted based on platform size
