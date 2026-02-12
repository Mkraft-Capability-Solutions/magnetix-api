-- ========================================
-- STORED PROCEDURE: Get Student Transcript Stats
-- ========================================
-- Returns 4 key statistics for transcript page:
-- 1. Courses Completed
-- 2. Learning Hours
-- 3. Skills Gained
-- 4. Total Achievements
-- ========================================

USE lms_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS `get_student_transcript_stats`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_student_transcript_stats` (
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  DECLARE total_hours DECIMAL(10,2);
  DECLARE last_month_hours DECIMAL(10,2);
  DECLARE hours_change DECIMAL(5,1);
  DECLARE completed_courses INT;
  DECLARE skills_gained INT;
  DECLARE total_achievements INT;

  -- Calculate total learning hours (all time)
  -- Sums all session durations from student_session table
  SELECT COALESCE(
    SUM(TIMESTAMPDIFF(SECOND, start_date, COALESCE(end_date, NOW()))) / 3600.0,
    0
  ) INTO total_hours
  FROM student_session
  WHERE user_id = p_user_id;

  -- Calculate last month's hours for comparison
  -- Only counts completed sessions (where end_date is NOT NULL)
  SELECT COALESCE(
    SUM(TIMESTAMPDIFF(SECOND, start_date, end_date)) / 3600.0,
    0
  ) INTO last_month_hours
  FROM student_session
  WHERE user_id = p_user_id
    AND MONTH(start_date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
    AND YEAR(start_date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
    AND end_date IS NOT NULL;

  -- Calculate percentage change for hours
  -- If last month had 0 hours: 100% if current > 0, else 0%
  SET hours_change = CASE
    WHEN last_month_hours = 0 AND total_hours > 0 THEN 100.0
    WHEN last_month_hours = 0 THEN 0.0
    ELSE ROUND(((total_hours - last_month_hours) / last_month_hours) * 100, 1)
  END;

  -- Count completed courses
  -- A course is considered completed when all its lessons are completed
  SELECT COUNT(DISTINCT e.course_id) INTO completed_courses
  FROM enrol e
  JOIN course c ON e.course_id = c.id
  WHERE e.user_id = p_user_id
    AND NOT EXISTS (
      -- Check if there are any incomplete lessons for this enrollment
      SELECT 1
      FROM course_progress cp
      WHERE cp.enroll_id = e.id
        AND (cp.lesson_completed IS NULL OR cp.lesson_completed = 0)
    )
    AND EXISTS (
      -- Ensure at least one lesson progress exists (course has started)
      SELECT 1
      FROM course_progress cp
      WHERE cp.enroll_id = e.id
    );

  -- Count skills in progress from AI learning path
  -- Skills are considered "in progress" when mastery_percentage < 100
  SELECT COUNT(*) INTO skills_gained
  FROM ai_learning_path_skills
  WHERE user_id = p_user_id
    AND mastery_percentage < 100;

  -- Count achievements from gamification system
  -- Only counts unlocked achievements
  SELECT COUNT(*) INTO total_achievements
  FROM user_achievements
  WHERE user_id = p_user_id
    AND is_unlocked = 1;

  -- Return all 4 stats as a result set
  -- Each row represents one stat card on the transcript page
  SELECT 1 as id, 'Course Completed' as label,
         CAST(completed_courses as CHAR) as value,
         CONCAT('+', completed_courses) as `change`
  UNION ALL
  SELECT 2, 'Learning Hours',
         CAST(ROUND(total_hours, 1) as CHAR),
         CONCAT(IF(hours_change >= 0, '+', ''), ROUND(hours_change, 1), '%')
  UNION ALL
  SELECT 3, 'Skills Gained',
         CAST(skills_gained as CHAR),
         CONCAT('+', skills_gained)
  UNION ALL
  SELECT 4, 'Total Achievements',
         CAST(total_achievements as CHAR),
         CONCAT('+', total_achievements);
END$$

DELIMITER ;

SELECT 'get_student_transcript_stats stored procedure created successfully!' AS status;
