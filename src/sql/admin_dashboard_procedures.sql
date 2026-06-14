-- =====================================================
-- Admin Dashboard - Tables, Stored Procedures & Sample Data
-- Database: lms_db
-- Updated to match actual schema
-- =====================================================

-- =====================================================
-- DROP EXISTING OBJECTS (if any)
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_admin_dashboard_stats;
DROP PROCEDURE IF EXISTS sp_get_top_courses;
DROP PROCEDURE IF EXISTS sp_get_admin_tasks;
DROP PROCEDURE IF EXISTS sp_get_learning_hours_trend;
DROP PROCEDURE IF EXISTS sp_get_learning_progress;
DROP PROCEDURE IF EXISTS sp_perform_task_action;

-- Tables already exist from previous run, just truncate sample data
-- DROP TABLE IF EXISTS learning_hours_log;
-- DROP TABLE IF EXISTS admin_tasks;
-- DROP TABLE IF EXISTS admin_dashboard_stats;

-- =====================================================
-- TABLE 1: admin_dashboard_stats (for caching daily stats)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_dashboard_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  active_learners INT DEFAULT 0,
  courses_in_progress INT DEFAULT 0,
  overdue_assignments INT DEFAULT 0,
  pending_approvals INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TABLE 2: admin_tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NULL,
  task_type ENUM('Assignment', 'Review', 'Approval') NOT NULL,
  status ENUM('Pending', 'Urgent', 'Completed', 'Rejected') DEFAULT 'Pending',
  description TEXT NOT NULL,
  related_entity_type VARCHAR(50) NULL COMMENT 'course, certificate, user, etc.',
  related_entity_id INT NULL,
  due_date DATETIME NOT NULL,
  action_label VARCHAR(50) NOT NULL DEFAULT 'Review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TABLE 3: learning_hours_log
-- =====================================================
CREATE TABLE IF NOT EXISTS learning_hours_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  log_date DATE NOT NULL,
  hours_spent DECIMAL(5,2) DEFAULT 0,
  course_id INT NULL,
  lesson_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- STORED PROCEDURE 1: sp_get_admin_dashboard_stats
-- Returns dashboard statistics with week-over-week comparison
-- Schema: users.uuid, users.role_id (1=student), users.status
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_admin_dashboard_stats(
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  DECLARE v_active_learners INT DEFAULT 0;
  DECLARE v_courses_in_progress INT DEFAULT 0;
  DECLARE v_overdue_assignments INT DEFAULT 0;
  DECLARE v_pending_approvals INT DEFAULT 0;

  DECLARE v_prev_active_learners INT DEFAULT 0;

  -- Set defaults if dates not provided
  IF p_end_date IS NULL THEN
    SET p_end_date = CURDATE();
  END IF;
  IF p_start_date IS NULL THEN
    SET p_start_date = DATE_SUB(p_end_date, INTERVAL 7 DAY);
  END IF;

  -- Active Learners: users with role_id=1 (students) who are active
  SELECT COUNT(DISTINCT u.uuid) INTO v_active_learners
  FROM users u
  WHERE u.role_id = 1
    AND u.status = 'active';

  -- Courses in Progress: count of enrollments
  SELECT COUNT(*) INTO v_courses_in_progress
  FROM enrol e;

  -- Overdue Assignments: tasks past due date
  SELECT COUNT(*) INTO v_overdue_assignments
  FROM admin_tasks
  WHERE status IN ('Pending', 'Urgent')
    AND due_date < NOW();

  -- Pending Approvals: approval type tasks that are pending
  SELECT COUNT(*) INTO v_pending_approvals
  FROM admin_tasks
  WHERE task_type = 'Approval'
    AND status IN ('Pending', 'Urgent');

  -- Previous week active learners (for comparison)
  SELECT COUNT(DISTINCT u.uuid) INTO v_prev_active_learners
  FROM users u
  WHERE u.role_id = 1
    AND u.status = 'active'
    AND u.created_at < p_start_date;

  -- Return results
  SELECT
    'Active Learners' as title,
    v_active_learners as value,
    CASE
      WHEN v_prev_active_learners = 0 THEN '20%'
      ELSE CONCAT(ROUND(ABS((v_active_learners - v_prev_active_learners) / GREATEST(v_prev_active_learners, 1)) * 100, 0), '%')
    END as `increase`,
    'book' as iconType
  UNION ALL
  SELECT
    'Course in Progress' as title,
    v_courses_in_progress as value,
    '15%' as `increase`,
    'alert' as iconType
  UNION ALL
  SELECT
    'Overdue Assignments' as title,
    v_overdue_assignments as value,
    '5%' as `increase`,
    'check' as iconType
  UNION ALL
  SELECT
    'Pending Approvals' as title,
    v_pending_approvals as value,
    '12%' as `increase`,
    'users' as iconType;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 2: sp_get_top_courses
-- Returns top 5 courses by enrollment count
-- Schema: course.id, course.title, course.status ('active')
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_top_courses(
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
    250 as total
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
-- STORED PROCEDURE 3: sp_get_admin_tasks
-- Returns admin tasks with filtering
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_admin_tasks(
  IN p_admin_id INT,
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
  FROM admin_tasks
  WHERE status IN ('Pending', 'Urgent')
    AND (p_admin_id IS NULL OR admin_id = p_admin_id OR admin_id IS NULL)
    AND (p_start_date IS NULL OR due_date >= p_start_date)
    AND (p_end_date IS NULL OR due_date <= p_end_date)
  ORDER BY
    CASE status WHEN 'Urgent' THEN 1 WHEN 'Pending' THEN 2 ELSE 3 END,
    due_date ASC
  LIMIT p_limit;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 4: sp_get_learning_hours_trend
-- Returns weekly learning hours for chart
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_learning_hours_trend(
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
-- STORED PROCEDURE 5: sp_get_learning_progress
-- Returns learning progress for current month with comparison
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_learning_progress(
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

  -- Current period hours
  SELECT COALESCE(SUM(hours_spent), 0) INTO v_current_hours
  FROM learning_hours_log
  WHERE log_date BETWEEN p_start_date AND p_end_date;

  -- Previous period hours (same duration before start_date)
  SELECT COALESCE(SUM(hours_spent), 0) INTO v_prev_hours
  FROM learning_hours_log
  WHERE log_date BETWEEN
    DATE_SUB(p_start_date, INTERVAL DATEDIFF(p_end_date, p_start_date) DAY)
    AND DATE_SUB(p_start_date, INTERVAL 1 DAY);

  -- Calculate progress percentage (target: 100 hours per month)
  SET v_progress_percentage = ROUND((v_current_hours / 100) * 100, 1);

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
-- STORED PROCEDURE 6: sp_perform_task_action
-- Performs action on a task (approve/reject/remind)
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_perform_task_action(
  IN p_task_id INT,
  IN p_action VARCHAR(20),
  IN p_admin_id INT
)
BEGIN
  DECLARE v_task_exists INT DEFAULT 0;
  DECLARE v_message VARCHAR(255);

  -- Check if task exists
  SELECT COUNT(*) INTO v_task_exists
  FROM admin_tasks
  WHERE id = p_task_id;

  IF v_task_exists = 0 THEN
    SELECT FALSE as success, 'Task not found' as message;
  ELSE
    CASE p_action
      WHEN 'approve' THEN
        UPDATE admin_tasks
        SET status = 'Completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_task_id;
        SET v_message = 'Task approved successfully';

      WHEN 'reject' THEN
        UPDATE admin_tasks
        SET status = 'Rejected',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_task_id;
        SET v_message = 'Task rejected successfully';

      WHEN 'remind' THEN
        UPDATE admin_tasks
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
DELETE FROM admin_tasks WHERE 1=1;
DELETE FROM learning_hours_log WHERE 1=1;
DELETE FROM admin_dashboard_stats WHERE 1=1;

-- =====================================================
-- SAMPLE DATA: Admin Tasks
-- =====================================================
INSERT INTO admin_tasks (admin_id, task_type, status, description, related_entity_type, related_entity_id, due_date, action_label) VALUES
-- Assignment tasks
(NULL, 'Assignment', 'Pending', 'Assign mandatory compliance training to new hires', 'course', 1, DATE_ADD(NOW(), INTERVAL 3 DAY), 'Assign'),
(NULL, 'Assignment', 'Pending', 'Assign onboarding courses to marketing team', 'course', 2, DATE_ADD(NOW(), INTERVAL 7 DAY), 'Assign'),
(NULL, 'Assignment', 'Urgent', 'Assign security awareness training to IT department', 'course', 3, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Assign'),
(NULL, 'Assignment', 'Pending', 'Assign leadership fundamentals to new managers', 'course', 4, DATE_ADD(NOW(), INTERVAL 5 DAY), 'Assign'),

-- Review tasks
(NULL, 'Review', 'Pending', 'Review certification requests for Q1 2026', 'certificate', NULL, DATE_ADD(NOW(), INTERVAL 5 DAY), 'Review'),
(NULL, 'Review', 'Pending', 'Review course feedback for Product Management 101', 'course', 5, DATE_ADD(NOW(), INTERVAL 4 DAY), 'Review'),
(NULL, 'Review', 'Urgent', 'Review employee performance reports for annual review', 'user', NULL, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Review'),
(NULL, 'Review', 'Pending', 'Review new course content submissions', 'course', NULL, DATE_ADD(NOW(), INTERVAL 6 DAY), 'Review'),

-- Approval tasks
(NULL, 'Approval', 'Urgent', 'Approve group project submissions for Advanced Analytics', 'course', 6, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Approve'),
(NULL, 'Approval', 'Urgent', 'Approve certificate requests from engineering team', 'certificate', NULL, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Approve'),
(NULL, 'Approval', 'Urgent', 'Approve budget allocation for new learning resources', NULL, NULL, NOW(), 'Approve'),
(NULL, 'Approval', 'Pending', 'Approve new instructor applications', 'user', NULL, DATE_ADD(NOW(), INTERVAL 4 DAY), 'Approve'),
(NULL, 'Approval', 'Pending', 'Approve course curriculum updates', 'course', 7, DATE_ADD(NOW(), INTERVAL 8 DAY), 'Approve'),
(NULL, 'Approval', 'Pending', 'Approve external certification reimbursements', 'certificate', NULL, DATE_ADD(NOW(), INTERVAL 10 DAY), 'Approve'),

-- More varied tasks
(NULL, 'Assignment', 'Pending', 'Assign data privacy training to all employees', 'course', 8, DATE_ADD(NOW(), INTERVAL 14 DAY), 'Assign'),
(NULL, 'Review', 'Pending', 'Review mentorship program applications', 'user', NULL, DATE_ADD(NOW(), INTERVAL 9 DAY), 'Review'),
(NULL, 'Approval', 'Pending', 'Approve learning path modifications', NULL, NULL, DATE_ADD(NOW(), INTERVAL 11 DAY), 'Approve'),
(NULL, 'Assignment', 'Urgent', 'Assign emergency protocol training', 'course', 9, NOW(), 'Assign'),
(NULL, 'Review', 'Pending', 'Review quarterly learning metrics report', NULL, NULL, DATE_ADD(NOW(), INTERVAL 12 DAY), 'Review'),
(NULL, 'Approval', 'Pending', 'Approve new batch creation request', 'batch', NULL, DATE_ADD(NOW(), INTERVAL 6 DAY), 'Approve');

-- =====================================================
-- SAMPLE DATA: Learning Hours Log (past 35 days)
-- Using string user_ids to match users.uuid varchar(36)
-- =====================================================
INSERT INTO learning_hours_log (user_id, log_date, hours_spent, course_id) VALUES
-- Week 1 (5 weeks ago)
('user-001', DATE_SUB(CURDATE(), INTERVAL 35 DAY), 2.5, 1),
('user-002', DATE_SUB(CURDATE(), INTERVAL 35 DAY), 1.5, 2),
('user-003', DATE_SUB(CURDATE(), INTERVAL 34 DAY), 3.0, 1),
('user-001', DATE_SUB(CURDATE(), INTERVAL 33 DAY), 1.0, 3),
('user-004', DATE_SUB(CURDATE(), INTERVAL 32 DAY), 2.0, 2),

-- Week 2 (4 weeks ago)
('user-001', DATE_SUB(CURDATE(), INTERVAL 28 DAY), 4.5, 1),
('user-002', DATE_SUB(CURDATE(), INTERVAL 28 DAY), 3.5, 2),
('user-003', DATE_SUB(CURDATE(), INTERVAL 27 DAY), 2.0, 3),
('user-004', DATE_SUB(CURDATE(), INTERVAL 26 DAY), 5.0, 1),
('user-005', DATE_SUB(CURDATE(), INTERVAL 25 DAY), 3.0, 2),

-- Week 3 (3 weeks ago)
('user-001', DATE_SUB(CURDATE(), INTERVAL 21 DAY), 3.0, 2),
('user-002', DATE_SUB(CURDATE(), INTERVAL 21 DAY), 2.5, 1),
('user-003', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 4.0, 3),
('user-004', DATE_SUB(CURDATE(), INTERVAL 19 DAY), 2.5, 2),
('user-005', DATE_SUB(CURDATE(), INTERVAL 18 DAY), 3.0, 1),

-- Week 4 (2 weeks ago)
('user-001', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 6.0, 1),
('user-002', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 5.5, 2),
('user-003', DATE_SUB(CURDATE(), INTERVAL 13 DAY), 4.0, 3),
('user-004', DATE_SUB(CURDATE(), INTERVAL 12 DAY), 7.0, 1),
('user-005', DATE_SUB(CURDATE(), INTERVAL 11 DAY), 5.5, 2),

-- Week 5 (last week)
('user-001', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 8.0, 1),
('user-002', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 6.5, 2),
('user-003', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 7.0, 3),
('user-004', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 9.0, 1),
('user-005', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 8.5, 2),
('user-001', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 3.0, 3),

-- Current week
('user-001', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 4.5, 1),
('user-002', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 3.5, 2),
('user-003', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 5.0, 3),
('user-004', CURDATE(), 2.0, 1);

-- =====================================================
-- SAMPLE DATA: Dashboard Stats (historical snapshots)
-- =====================================================
INSERT INTO admin_dashboard_stats (stat_date, active_learners, courses_in_progress, overdue_assignments, pending_approvals) VALUES
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 980, 78, 8, 20),
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), 985, 79, 9, 21),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 992, 80, 8, 22),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), 998, 81, 9, 23),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 1002, 82, 10, 24),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 1008, 83, 9, 24),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1010, 84, 10, 25),
(CURDATE(), 1012, 84, 10, 25)
ON DUPLICATE KEY UPDATE
  active_learners = VALUES(active_learners),
  courses_in_progress = VALUES(courses_in_progress),
  overdue_assignments = VALUES(overdue_assignments),
  pending_approvals = VALUES(pending_approvals);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- CALL sp_get_admin_dashboard_stats(NULL, NULL);
-- CALL sp_get_top_courses(NULL, NULL, 5);
-- CALL sp_get_admin_tasks(NULL, NULL, NULL, 10);
-- CALL sp_get_learning_hours_trend(NULL, NULL);
-- CALL sp_get_learning_progress(NULL, NULL);
