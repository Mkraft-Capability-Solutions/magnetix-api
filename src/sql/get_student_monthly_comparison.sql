-- ========================================
-- STORED PROCEDURE: Get Student Monthly Comparison
-- ========================================
-- Compares current month vs last month learning hours
-- Used by: Transcript page donut chart
-- ========================================

USE lms_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS `get_student_monthly_comparison`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_student_monthly_comparison` (
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  DECLARE current_month_name VARCHAR(20);
  DECLARE last_month_name VARCHAR(20);
  DECLARE current_hours DECIMAL(10,2);
  DECLARE last_hours DECIMAL(10,2);
  DECLARE pct_change DECIMAL(10,2);
  DECLARE total DECIMAL(10,2);

  -- Get month names (e.g., "January", "December")
  SET current_month_name = DATE_FORMAT(NOW(), '%B');
  SET last_month_name = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%B');

  -- Calculate current month hours
  SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_date, COALESCE(end_date, NOW()))) / 3600.0, 0)
  INTO current_hours
  FROM student_session
  WHERE user_id = p_user_id
    AND MONTH(start_date) = MONTH(NOW())
    AND YEAR(start_date) = YEAR(NOW());

  -- Calculate last month hours
  SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_date, end_date)) / 3600.0, 0)
  INTO last_hours
  FROM student_session
  WHERE user_id = p_user_id
    AND MONTH(start_date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
    AND YEAR(start_date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
    AND end_date IS NOT NULL;

  -- Calculate percentage change
  SET pct_change = CASE
    WHEN last_hours = 0 AND current_hours > 0 THEN 100.0
    WHEN last_hours = 0 THEN 0.0
    ELSE ROUND(((current_hours - last_hours) / last_hours) * 100, 2)
  END;

  -- Calculate total combined
  SET total = current_hours + last_hours;

  -- Return single result set
  SELECT
    current_month_name as currentMonth,
    ROUND(current_hours, 2) as currentMonthHours,
    last_month_name as lastMonth,
    ROUND(last_hours, 2) as lastMonthHours,
    ROUND(pct_change, 2) as percentageChange,
    ROUND(total, 2) as totalCombined;

END$$

DELIMITER ;

SELECT 'get_student_monthly_comparison stored procedure created successfully!' AS status;
