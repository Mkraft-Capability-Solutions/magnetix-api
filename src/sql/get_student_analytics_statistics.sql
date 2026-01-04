-- ========================================
-- STORED PROCEDURE: Get Student Analytics Statistics
-- ========================================
-- Returns current month summary and weekly breakdown
-- Used by: Transcript page weekly learning chart
-- ========================================

USE lms_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS `get_student_analytics_statistics`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_student_analytics_statistics` (
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  DECLARE current_month_name VARCHAR(20);
  DECLARE total_hours_this_month DECIMAL(10,2);
  DECLARE progress_pct DECIMAL(5,2);

  -- Get current month name (e.g., "January 2026")
  SET current_month_name = DATE_FORMAT(NOW(), '%M %Y');

  -- Calculate total hours for current month
  SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_date, COALESCE(end_date, NOW()))) / 3600.0, 0)
  INTO total_hours_this_month
  FROM student_session
  WHERE user_id = p_user_id
    AND MONTH(start_date) = MONTH(NOW())
    AND YEAR(start_date) = YEAR(NOW());

  -- Calculate progress percentage (compare to last month)
  -- If last month had 0 hours, show 100% if current > 0, else 0%
  SELECT CASE
    WHEN last_month_hours = 0 AND total_hours_this_month > 0 THEN 100.0
    WHEN last_month_hours = 0 THEN 0.0
    ELSE ROUND(((total_hours_this_month - last_month_hours) / last_month_hours) * 100, 2)
  END
  INTO progress_pct
  FROM (
    SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_date, end_date)) / 3600.0, 0) as last_month_hours
    FROM student_session
    WHERE user_id = p_user_id
      AND MONTH(start_date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
      AND YEAR(start_date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
      AND end_date IS NOT NULL
  ) as last_month;

  -- Result Set 1: Month Summary
  SELECT
    current_month_name as month,
    ROUND(total_hours_this_month, 2) as totalHours,
    ROUND(progress_pct, 2) as progressPercentage;

  -- Result Set 2: Weekly Data (last 5 weeks)
  WITH RECURSIVE week_numbers AS (
    SELECT 1 as week_num, DATE_SUB(NOW(), INTERVAL 4 WEEK) as week_start
    UNION ALL
    SELECT week_num + 1, DATE_ADD(week_start, INTERVAL 1 WEEK)
    FROM week_numbers
    WHERE week_num < 5
  )
  SELECT
    wn.week_num as week_number,
    DATE_FORMAT(wn.week_start, '%d %b') as date,
    COALESCE(
      (SELECT ROUND(SUM(TIMESTAMPDIFF(SECOND, start_date, COALESCE(end_date, NOW()))) / 3600.0, 2)
       FROM student_session
       WHERE user_id = p_user_id
         AND start_date >= wn.week_start
         AND start_date < DATE_ADD(wn.week_start, INTERVAL 1 WEEK)
      ), 0
    ) as hours
  FROM week_numbers wn
  ORDER BY wn.week_num;

END$$

DELIMITER ;

SELECT 'get_student_analytics_statistics stored procedure created successfully!' AS status;
