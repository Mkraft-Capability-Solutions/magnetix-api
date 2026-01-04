DELIMITER //
CREATE PROCEDURE sp_get_department_performance()
BEGIN
  SELECT COALESCE(sci.department, 'Unassigned') as department, COUNT(DISTINCT u.uuid) as totalUsers, COUNT(DISTINCT e.user_id) as usersWithEnrollments, ROUND(COUNT(DISTINCT e.user_id) * 100.0 / NULLIF(COUNT(DISTINCT u.uuid), 0), 0) as completedPercentage, 100 as totalPercentage FROM users u LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id LEFT JOIN enrol e ON u.uuid = e.user_id WHERE u.is_deleted = 0 AND u.role_id = 1 GROUP BY COALESCE(sci.department, 'Unassigned') HAVING department \!= 'Unassigned' ORDER BY completedPercentage DESC LIMIT 10;
END //
DELIMITER ;
