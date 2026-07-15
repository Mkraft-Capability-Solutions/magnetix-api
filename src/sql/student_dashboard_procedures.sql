-- ========================================
-- STUDENT DASHBOARD PROCEDURES
-- ========================================
-- Procedures for student dashboard statistics
-- ========================================

USE lxp_db;

-- ========================================
-- PROCEDURE: get_student_dashboard_stats
-- ========================================
-- Gets dashboard statistics for a student including:
-- - Total courses enrolled
-- - Completed courses
-- - Courses to milestone
-- - Total certificates (from both course completions and admin-issued)
-- - Learning streak
-- - Monthly learning hours and goal
-- ========================================

DROP PROCEDURE IF EXISTS get_student_dashboard_stats;

DELIMITER $$

CREATE PROCEDURE get_student_dashboard_stats(
  IN p_user_id VARCHAR(36)
)
BEGIN
  DECLARE v_total_courses INT DEFAULT 0;
  DECLARE v_completed_courses INT DEFAULT 0;
  DECLARE v_courses_to_milestone INT DEFAULT 0;
  DECLARE v_total_certificates INT DEFAULT 0;
  DECLARE v_course_certificates INT DEFAULT 0;
  DECLARE v_admin_certificates INT DEFAULT 0;
  DECLARE v_learning_streak INT DEFAULT 0;
  DECLARE v_current_monthly_hours DECIMAL(10,2) DEFAULT 0;
  DECLARE v_monthly_goal_hours DECIMAL(10,2) DEFAULT 20.0;
  DECLARE v_monthly_goal_percentage DECIMAL(5,2) DEFAULT 0;

  -- Get total enrolled courses
  SELECT COUNT(*)
  INTO v_total_courses
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  WHERE e.user_id = p_user_id
    AND c.is_deleted = 0
    AND c.status = 'active';

  -- Get completed courses (100% progress)
  SELECT COUNT(*)
  INTO v_completed_courses
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  WHERE e.user_id = p_user_id
    AND c.is_deleted = 0
    AND c.status = 'active'
    AND (
      SELECT COUNT(*)
      FROM course_progress cp
      WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1
    ) = (
      SELECT COUNT(*)
      FROM course_lesson cl
      WHERE cl.course_id = c.id
    )
    AND (
      SELECT COUNT(*)
      FROM course_lesson cl
      WHERE cl.course_id = c.id
    ) > 0;

  -- Calculate courses to next milestone (next multiple of 5)
  SET v_courses_to_milestone = 5 - (v_completed_courses % 5);
  IF v_courses_to_milestone = 5 AND v_completed_courses > 0 THEN
    SET v_courses_to_milestone = 0;
  END IF;

  -- Get course completion certificates count
  -- (Assuming student_certificates table tracks course completion certificates)
  SELECT COUNT(*)
  INTO v_course_certificates
  FROM student_certificates
  WHERE user_id = p_user_id
    AND status = 'approved';

  -- Get admin-issued certificates count
  SELECT COUNT(*)
  INTO v_admin_certificates
  FROM admin_issued_certificates
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (expiry_date IS NULL OR expiry_date >= CURDATE());

  -- Total certificates = course certificates + admin certificates
  SET v_total_certificates = v_course_certificates + v_admin_certificates;

  -- Calculate learning streak (consecutive days with lesson completions)
  -- This is a simplified version - you might want to enhance this logic
  WITH RECURSIVE dates AS (
    SELECT CURDATE() as check_date
    UNION ALL
    SELECT DATE_SUB(check_date, INTERVAL 1 DAY)
    FROM dates
    WHERE check_date > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  ),
  daily_activity AS (
    -- course_progress has no completed_at; last_access reflects when a lesson
    -- row was last updated (i.e. completed), so it drives the streak by date.
    SELECT
      DATE(cp.last_access) as activity_date,
      COUNT(*) as lessons_completed
    FROM course_progress cp
    INNER JOIN enrol e ON cp.enroll_id = e.id
    WHERE e.user_id = p_user_id
      AND cp.lesson_completed = 1
      AND cp.last_access IS NOT NULL
    GROUP BY DATE(cp.last_access)
  )
  SELECT
    COUNT(*)
  INTO v_learning_streak
  FROM (
    SELECT @rownum := @rownum + 1 AS rn, check_date
    FROM dates, (SELECT @rownum := 0) r
    WHERE check_date IN (SELECT activity_date FROM daily_activity)
    ORDER BY check_date DESC
  ) AS streak
  WHERE rn = DATEDIFF(CURDATE(), check_date) + 1;

  -- Get current month's learning hours from learner_hours_log
  -- (If this table doesn't exist, set to 0)
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '42S02' SET v_current_monthly_hours = 0;

    SELECT COALESCE(SUM(hours_spent), 0)
    INTO v_current_monthly_hours
    FROM learner_hours_log
    WHERE user_id = p_user_id
      AND YEAR(log_date) = YEAR(CURDATE())
      AND MONTH(log_date) = MONTH(CURDATE());
  END;

  -- Calculate monthly goal percentage
  SET v_monthly_goal_percentage = LEAST(100, (v_current_monthly_hours / v_monthly_goal_hours) * 100);

  -- Return all stats
  SELECT
    v_total_courses as total_courses,
    v_completed_courses as completed_courses,
    v_courses_to_milestone as courses_to_milestone,
    v_total_certificates as total_certificates,
    v_learning_streak as learning_streak,
    ROUND(v_current_monthly_hours, 1) as current_monthly_hours,
    ROUND(v_monthly_goal_hours, 1) as monthly_goal_hours,
    ROUND(v_monthly_goal_percentage, 0) as monthly_goal_percentage;

END$$

DELIMITER ;

SELECT 'Student dashboard procedures created successfully!' AS status;
