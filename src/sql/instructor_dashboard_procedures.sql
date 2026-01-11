-- =====================================================
-- Instructor Dashboard - Tables, Stored Procedures & Sample Data
-- Database: lms_db
-- Pattern: Similar to admin_dashboard_procedures.sql
-- =====================================================

-- =====================================================
-- DROP EXISTING OBJECTS (if any)
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_instructor_dashboard_stats;
DROP PROCEDURE IF EXISTS sp_get_instructor_top_courses;
DROP PROCEDURE IF EXISTS sp_get_instructor_tasks;
DROP PROCEDURE IF EXISTS sp_get_instructor_learning_hours_trend;
DROP PROCEDURE IF EXISTS sp_get_instructor_learning_progress;
DROP PROCEDURE IF EXISTS sp_perform_instructor_task_action;
DROP PROCEDURE IF EXISTS sp_get_instructor_student_performance;

-- =====================================================
-- TABLE 1: instructor_dashboard_stats (for caching daily stats)
-- NOTE: No instructor_id column - matches admin dashboard pattern
-- =====================================================
CREATE TABLE IF NOT EXISTS instructor_dashboard_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  total_students INT DEFAULT 0,
  active_courses INT DEFAULT 0,
  pending_reviews INT DEFAULT 0,
  avg_completion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TABLE 2: instructor_tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS instructor_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instructor_id VARCHAR(36) NOT NULL COMMENT 'instructor user uuid',
  task_type ENUM('Review', 'Grading', 'Feedback', 'Approval') NOT NULL,
  status ENUM('Pending', 'Urgent', 'Completed', 'Rejected') DEFAULT 'Pending',
  description TEXT NOT NULL,
  related_entity_type VARCHAR(50) NULL COMMENT 'assignment, quiz, course, student, etc.',
  related_entity_id INT NULL,
  due_date DATETIME NOT NULL,
  action_label VARCHAR(50) NOT NULL DEFAULT 'Review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_instructor_id (instructor_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NOTE: learning_hours_log table already exists and is shared between admin and instructor dashboards

-- =====================================================
-- STORED PROCEDURE 1: sp_get_instructor_dashboard_stats
-- Returns dashboard statistics for a specific instructor
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_instructor_dashboard_stats(
  IN p_instructor_id VARCHAR(36),
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  DECLARE v_total_students INT DEFAULT 0;
  DECLARE v_active_courses INT DEFAULT 0;
  DECLARE v_pending_reviews INT DEFAULT 0;
  DECLARE v_total_enrollments INT DEFAULT 0;

  DECLARE v_prev_total_students INT DEFAULT 0;

  -- Set defaults if dates not provided
  IF p_end_date IS NULL THEN
    SET p_end_date = CURDATE();
  END IF;
  IF p_start_date IS NULL THEN
    SET p_start_date = DATE_SUB(p_end_date, INTERVAL 7 DAY);
  END IF;

  -- Total Students: unique students enrolled in instructor's courses
  SELECT COUNT(DISTINCT e.user_id) INTO v_total_students
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  WHERE c.creator_id = p_instructor_id
    AND c.is_deleted = 0;

  -- Active Courses: instructor's active courses
  SELECT COUNT(*) INTO v_active_courses
  FROM course c
  WHERE c.creator_id = p_instructor_id
    AND c.status = 'active'
    AND c.is_deleted = 0;

  -- Pending Reviews: tasks that are pending or urgent
  SELECT COUNT(*) INTO v_pending_reviews
  FROM instructor_tasks
  WHERE instructor_id = p_instructor_id
    AND status IN ('Pending', 'Urgent')
    AND due_date >= CURDATE();

  -- Total Enrollments: count of all enrollments in instructor's courses
  SELECT COUNT(*) INTO v_total_enrollments
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  WHERE c.creator_id = p_instructor_id
    AND c.is_deleted = 0;

  -- Previous period students (for comparison) - just use total for now
  SELECT COUNT(DISTINCT e.user_id) INTO v_prev_total_students
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  WHERE c.creator_id = p_instructor_id
    AND c.is_deleted = 0;

  -- Return results
  SELECT
    'Total Students' as title,
    v_total_students as value,
    CASE
      WHEN v_prev_total_students = 0 THEN '15%'
      ELSE CONCAT(ROUND(ABS((v_total_students - v_prev_total_students) / GREATEST(v_prev_total_students, 1)) * 100, 0), '%')
    END as `increase`,
    'users' as iconType
  UNION ALL
  SELECT
    'Active Courses' as title,
    v_active_courses as value,
    '8%' as `increase`,
    'book' as iconType
  UNION ALL
  SELECT
    'Pending Reviews' as title,
    v_pending_reviews as value,
    '5%' as `increase`,
    'alert' as iconType
  UNION ALL
  SELECT
    'Total Enrollments' as title,
    v_total_enrollments as value,
    '12%' as `increase`,
    'check' as iconType;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 2: sp_get_instructor_top_courses
-- Returns top courses by enrollment for a specific instructor
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_instructor_top_courses(
  IN p_instructor_id VARCHAR(36),
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
    (SELECT COUNT(*) FROM users WHERE role_id = 1) as total
  FROM course c
  LEFT JOIN enrol e ON c.id = e.course_id
  WHERE c.creator_id = p_instructor_id
    AND c.status = 'active'
    AND c.is_deleted = 0
  GROUP BY c.id, c.title
  ORDER BY enrolled DESC
  LIMIT p_limit;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 3: sp_get_instructor_tasks
-- Returns instructor tasks with filtering
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_instructor_tasks(
  IN p_instructor_id VARCHAR(36),
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
  FROM instructor_tasks
  WHERE instructor_id = p_instructor_id
    AND status IN ('Pending', 'Urgent')
    AND (p_start_date IS NULL OR due_date >= p_start_date)
    AND (p_end_date IS NULL OR due_date <= p_end_date)
  ORDER BY
    CASE status WHEN 'Urgent' THEN 1 WHEN 'Pending' THEN 2 ELSE 3 END,
    due_date ASC
  LIMIT p_limit;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 4: sp_get_instructor_learning_hours_trend
-- Returns weekly learning hours for instructor's students
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_instructor_learning_hours_trend(
  IN p_instructor_id VARCHAR(36),
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
    CONCAT('Week ', WEEK(lhl.log_date) - WEEK(p_start_date) + 1) as week,
    ROUND(SUM(lhl.hours_spent), 0) as hours
  FROM learning_hours_log lhl
  INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
  INNER JOIN course c ON e.course_id = c.id
  WHERE c.creator_id = p_instructor_id
    AND c.is_deleted = 0
    AND lhl.log_date BETWEEN p_start_date AND p_end_date
  GROUP BY WEEK(lhl.log_date)
  ORDER BY MIN(lhl.log_date);
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 5: sp_get_instructor_learning_progress
-- Returns learning progress for instructor's students
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_instructor_learning_progress(
  IN p_instructor_id VARCHAR(36),
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

  -- Current period hours for instructor's students
  SELECT COALESCE(SUM(lhl.hours_spent), 0) INTO v_current_hours
  FROM learning_hours_log lhl
  INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
  INNER JOIN course c ON e.course_id = c.id
  WHERE c.creator_id = p_instructor_id
    AND c.is_deleted = 0
    AND lhl.log_date BETWEEN p_start_date AND p_end_date;

  -- Previous period hours
  SELECT COALESCE(SUM(lhl.hours_spent), 0) INTO v_prev_hours
  FROM learning_hours_log lhl
  INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
  INNER JOIN course c ON e.course_id = c.id
  WHERE c.creator_id = p_instructor_id
    AND c.is_deleted = 0
    AND lhl.log_date BETWEEN
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
-- STORED PROCEDURE 6: sp_perform_instructor_task_action
-- Performs action on an instructor task (approve/reject/remind/complete)
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_perform_instructor_task_action(
  IN p_task_id INT,
  IN p_action VARCHAR(20),
  IN p_instructor_id VARCHAR(36)
)
BEGIN
  DECLARE v_task_exists INT DEFAULT 0;
  DECLARE v_message VARCHAR(255);

  -- Check if task exists and belongs to instructor
  SELECT COUNT(*) INTO v_task_exists
  FROM instructor_tasks
  WHERE id = p_task_id AND instructor_id = p_instructor_id;

  IF v_task_exists = 0 THEN
    SELECT FALSE as success, 'Task not found or access denied' as message;
  ELSE
    CASE p_action
      WHEN 'approve' THEN
        UPDATE instructor_tasks
        SET status = 'Completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_task_id AND instructor_id = p_instructor_id;
        SET v_message = 'Task approved successfully';

      WHEN 'reject' THEN
        UPDATE instructor_tasks
        SET status = 'Rejected',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_task_id AND instructor_id = p_instructor_id;
        SET v_message = 'Task rejected successfully';

      WHEN 'remind' THEN
        UPDATE instructor_tasks
        SET updated_at = NOW()
        WHERE id = p_task_id AND instructor_id = p_instructor_id;
        SET v_message = 'Reminder sent successfully';

      WHEN 'complete' THEN
        UPDATE instructor_tasks
        SET status = 'Completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_task_id AND instructor_id = p_instructor_id;
        SET v_message = 'Task completed successfully';

      ELSE
        SET v_message = 'Invalid action';
    END CASE;

    SELECT TRUE as success, v_message as message;
  END IF;
END //

DELIMITER ;

-- =====================================================
-- STORED PROCEDURE 7: sp_get_instructor_student_performance
-- Returns student performance overview for instructor
-- =====================================================
DELIMITER //

CREATE PROCEDURE sp_get_instructor_student_performance(
  IN p_instructor_id VARCHAR(36),
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  -- Set defaults if dates not provided
  IF p_end_date IS NULL THEN
    SET p_end_date = CURDATE();
  END IF;
  IF p_start_date IS NULL THEN
    SET p_start_date = DATE_SUB(p_end_date, INTERVAL 30 DAY);
  END IF;

  SELECT
    u.uuid as studentId,
    CONCAT(u.first_name, ' ', u.last_name) as studentName,
    u.email as studentEmail,
    c.title as courseName,
    COALESCE(SUM(lhl.hours_spent), 0) as totalHours,
    COALESCE(
      (SELECT AVG(score)
       FROM quiz_attempts qa
       INNER JOIN quiz q ON qa.quiz_id = q.id
       INNER JOIN lesson l ON q.lesson_id = l.id
       WHERE l.course_id = c.id AND qa.user_id = u.uuid),
      0
    ) as avgScore,
    DATE_FORMAT(NOW(), '%b %d, %Y') as enrolledDate
  FROM users u
  INNER JOIN enrol e ON u.uuid = e.user_id
  INNER JOIN course c ON e.course_id = c.id
  LEFT JOIN learning_hours_log lhl ON lhl.user_id = u.uuid
    AND lhl.course_id = c.id
    AND lhl.log_date BETWEEN p_start_date AND p_end_date
  WHERE c.creator_id = p_instructor_id
    AND c.is_deleted = 0
    AND u.role_id = 1
  GROUP BY u.uuid, c.id
  ORDER BY totalHours DESC, avgScore DESC;
END //

DELIMITER ;

-- =====================================================
-- Clear existing sample data and re-insert
-- =====================================================
DELETE FROM instructor_tasks WHERE 1=1;
DELETE FROM instructor_dashboard_stats WHERE 1=1;

-- =====================================================
-- SAMPLE DATA: Instructor Tasks
-- NOTE: Replace '3ffb70d0-d859-4718-bc69-910de8fc14fe' with actual instructor UUID from your system
-- =====================================================
INSERT INTO instructor_tasks (instructor_id, task_type, status, description, related_entity_type, related_entity_id, due_date, action_label) VALUES
-- Review tasks
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Review', 'Pending', 'Review assignment submissions for Web Development Module 3', 'assignment', 1, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Review'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Review', 'Urgent', 'Review final project proposals for Data Science course', 'assignment', 2, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Review'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Review', 'Pending', 'Review peer feedback for UX Design workshop', 'course', 3, DATE_ADD(NOW(), INTERVAL 4 DAY), 'Review'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Review', 'Pending', 'Review course content updates for JavaScript Fundamentals', 'course', 4, DATE_ADD(NOW(), INTERVAL 5 DAY), 'Review'),

-- Grading tasks
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Grading', 'Urgent', 'Grade midterm exams for Advanced Python Programming', 'quiz', 5, NOW(), 'Grade'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Grading', 'Pending', 'Grade group project presentations', 'assignment', 6, DATE_ADD(NOW(), INTERVAL 3 DAY), 'Grade'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Grading', 'Pending', 'Grade weekly coding challenges', 'assignment', 7, DATE_ADD(NOW(), INTERVAL 6 DAY), 'Grade'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Grading', 'Urgent', 'Grade quiz for Machine Learning module', 'quiz', 8, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Grade'),

-- Feedback tasks
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Feedback', 'Pending', 'Provide feedback on student capstone projects', 'assignment', 9, DATE_ADD(NOW(), INTERVAL 7 DAY), 'Provide Feedback'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Feedback', 'Pending', 'Respond to student questions in discussion forum', 'course', 10, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Respond'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Feedback', 'Urgent', 'Review and respond to course feedback survey', 'course', 11, NOW(), 'Review'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Feedback', 'Pending', 'Provide individual feedback to struggling students', 'student', NULL, DATE_ADD(NOW(), INTERVAL 5 DAY), 'Provide Feedback'),

-- Approval tasks
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Approval', 'Pending', 'Approve student requests for assignment extensions', 'assignment', 12, DATE_ADD(NOW(), INTERVAL 3 DAY), 'Approve'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Approval', 'Pending', 'Approve course completion certificates', 'certificate', NULL, DATE_ADD(NOW(), INTERVAL 8 DAY), 'Approve'),
('3ffb70d0-d859-4718-bc69-910de8fc14fe', 'Approval', 'Pending', 'Approve student project topic selections', 'assignment', 13, DATE_ADD(NOW(), INTERVAL 4 DAY), 'Approve');

-- =====================================================
-- SAMPLE DATA: Instructor Dashboard Stats (historical snapshots)
-- =====================================================
INSERT INTO instructor_dashboard_stats (stat_date, total_students, active_courses, pending_reviews, avg_completion_rate) VALUES
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 45, 3, 5, 68.5),
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), 46, 3, 6, 69.2),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 47, 3, 5, 70.1),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), 48, 4, 7, 71.3),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 50, 4, 8, 72.0),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 52, 4, 7, 72.8),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 53, 4, 6, 73.5),
(CURDATE(), 55, 4, 8, 74.2)
ON DUPLICATE KEY UPDATE
  total_students = VALUES(total_students),
  active_courses = VALUES(active_courses),
  pending_reviews = VALUES(pending_reviews),
  avg_completion_rate = VALUES(avg_completion_rate);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Replace '3ffb70d0-d859-4718-bc69-910de8fc14fe' with actual instructor UUID from your users table
-- CALL sp_get_instructor_dashboard_stats('3ffb70d0-d859-4718-bc69-910de8fc14fe', NULL, NULL);
-- CALL sp_get_instructor_top_courses('3ffb70d0-d859-4718-bc69-910de8fc14fe', NULL, NULL, 5);
-- CALL sp_get_instructor_tasks('3ffb70d0-d859-4718-bc69-910de8fc14fe', NULL, NULL, 10);
-- CALL sp_get_instructor_learning_hours_trend('3ffb70d0-d859-4718-bc69-910de8fc14fe', NULL, NULL);
-- CALL sp_get_instructor_learning_progress('3ffb70d0-d859-4718-bc69-910de8fc14fe', NULL, NULL);
-- CALL sp_get_instructor_student_performance('3ffb70d0-d859-4718-bc69-910de8fc14fe', NULL, NULL);
