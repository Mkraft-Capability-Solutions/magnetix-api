-- =============================================
-- Admin Reports & Analytics Procedures
-- =============================================

-- =============================================
-- DROP existing procedures if they exist
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_report_leaderboard;
DROP PROCEDURE IF EXISTS sp_get_department_performance;
DROP PROCEDURE IF EXISTS sp_get_completion_trends;
DROP PROCEDURE IF EXISTS sp_get_certification_distribution;
DROP PROCEDURE IF EXISTS sp_get_user_report_data;
DROP PROCEDURE IF EXISTS sp_get_course_completion_report;
DROP PROCEDURE IF EXISTS sp_get_learning_engagement_report;

DELIMITER //

-- =============================================
-- Get Leaderboard - Top performers
-- =============================================
CREATE PROCEDURE sp_get_report_leaderboard(
  IN p_limit INT
)
BEGIN
  SET p_limit = COALESCE(p_limit, 50);

  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(points.total_points, 0) DESC) as `rank`,
    CONCAT(profile.first_name, ' ', profile.last_name) as name,
    UPPER(CONCAT(LEFT(profile.first_name, 1), LEFT(profile.last_name, 1))) as initials,
    CASE
      WHEN COALESCE(points.total_points, 0) >= 15000 THEN 'Level 4'
      WHEN COALESCE(points.total_points, 0) >= 10000 THEN 'Level 3'
      WHEN COALESCE(points.total_points, 0) >= 5000 THEN 'Level 2'
      ELSE 'Level 1'
    END as level,
    CASE
      WHEN COALESCE(points.total_points, 0) >= 15000 THEN '#4ade80'
      WHEN COALESCE(points.total_points, 0) >= 10000 THEN '#3b82f6'
      WHEN COALESCE(points.total_points, 0) >= 5000 THEN '#a855f7'
      ELSE '#f97316'
    END as levelColor,
    CASE
      WHEN COALESCE(points.total_points, 0) >= 15000 THEN 100
      ELSE ROUND((COALESCE(points.total_points, 0) % 5000) / 50, 0)
    END as progress,
    CASE
      WHEN COALESCE(points.total_points, 0) >= 15000 THEN 'Top Level'
      ELSE CONCAT(5000 - (COALESCE(points.total_points, 0) % 5000), ' pts to next level')
    END as progressText,
    FORMAT(COALESCE(points.total_points, 0), 0) as points,
    COALESCE(course_stats.completed, 0) as coursesCompleted,
    COALESCE(cert_stats.total_certs, 0) as certificates,
    'same' as trend
  FROM users u
  LEFT JOIN (
    SELECT user_id, first_name, last_name FROM students
    UNION ALL
    SELECT user_id, first_name, last_name FROM instructors
    UNION ALL
    SELECT user_id, first_name, last_name FROM admins
  ) profile ON u.uuid = profile.user_id
  LEFT JOIN user_points points ON u.uuid = points.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as completed
    FROM enrol
    WHERE enrolled_date IS NOT NULL
    GROUP BY user_id
  ) course_stats ON u.uuid = course_stats.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total_certs
    FROM student_certificates
    GROUP BY user_id
  ) cert_stats ON u.uuid = cert_stats.user_id
  WHERE u.is_deleted = 0
  ORDER BY COALESCE(points.total_points, 0) DESC
  LIMIT p_limit;
END //

-- =============================================
-- Get Department Performance
-- =============================================
CREATE PROCEDURE sp_get_department_performance()
BEGIN
  SELECT
    COALESCE(sci.department, 'Unassigned') as department,
    COUNT(DISTINCT u.uuid) as totalUsers,
    COUNT(DISTINCT e.user_id) as usersWithEnrollments,
    ROUND(COUNT(DISTINCT e.user_id) * 100.0 / NULLIF(COUNT(DISTINCT u.uuid), 0), 0) as completedPercentage,
    100 as totalPercentage
  FROM users u
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN enrol e ON u.uuid = e.user_id
  WHERE u.is_deleted = 0 AND u.role_id = 1
  GROUP BY COALESCE(sci.department, 'Unassigned')
  HAVING department != 'Unassigned'
  ORDER BY completedPercentage DESC
  LIMIT 10;
END //

-- =============================================
-- Get Completion Trends (Last 6 months)
-- =============================================
CREATE PROCEDURE sp_get_completion_trends()
BEGIN
  SELECT
    DATE_FORMAT(months.month_date, '%b') as month,
    COALESCE(enrolled_count, 0) as enrolled,
    COALESCE(completed_count, 0) as completed,
    ROUND(COALESCE(enrolled_count, 0) * 0.85) as target
  FROM (
    SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m-01') as month_date
    FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) months
  ) months
  LEFT JOIN (
    SELECT
      DATE_FORMAT(enrolled_date, '%Y-%m-01') as enroll_month,
      COUNT(*) as enrolled_count
    FROM enrol
    WHERE enrolled_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(enrolled_date, '%Y-%m-01')
  ) enrollments ON months.month_date = enrollments.enroll_month
  LEFT JOIN (
    SELECT
      DATE_FORMAT(e.last_updated, '%Y-%m-01') as complete_month,
      COUNT(*) as completed_count
    FROM enrol e
    WHERE e.last_updated >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(e.last_updated, '%Y-%m-01')
  ) completions ON months.month_date = completions.complete_month
  ORDER BY months.month_date ASC;
END //

-- =============================================
-- Get Certification Distribution
-- =============================================
CREATE PROCEDURE sp_get_certification_distribution()
BEGIN
  SELECT
    COALESCE(sc.certificate_name, 'Other') as type,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM student_certificates), 0), 0) as percentage,
    CASE
      WHEN ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) = 1 THEN '#10b981'
      WHEN ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) = 2 THEN '#3b82f6'
      WHEN ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) = 3 THEN '#a855f7'
      ELSE '#f59e0b'
    END as color
  FROM student_certificates sc
  GROUP BY COALESCE(sc.certificate_name, 'Other')
  ORDER BY COUNT(*) DESC
  LIMIT 5;
END //

-- =============================================
-- Get User Report Data (for export)
-- =============================================
CREATE PROCEDURE sp_get_user_report_data(
  IN p_from_date DATE,
  IN p_to_date DATE,
  IN p_department VARCHAR(100)
)
BEGIN
  SELECT
    u.uuid as userId,
    CONCAT(profile.first_name, ' ', profile.last_name) as fullName,
    u.email,
    CASE u.role_id
      WHEN 1 THEN 'Student'
      WHEN 2 THEN 'Instructor'
      WHEN 3 THEN 'Admin'
    END as role,
    COALESCE(sci.department, 'N/A') as department,
    COALESCE(sci.designation, 'N/A') as jobTitle,
    u.status,
    DATE_FORMAT(u.created_at, '%Y-%m-%d') as joinDate,
    DATE_FORMAT(u.updated_at, '%Y-%m-%d %H:%i') as lastLogin,
    COALESCE(course_stats.enrolled, 0) as coursesEnrolled,
    COALESCE(course_stats.completed, 0) as coursesCompleted,
    COALESCE(cert_stats.total_certs, 0) as certificatesEarned,
    COALESCE(points.total_points, 0) as totalPoints
  FROM users u
  LEFT JOIN (
    SELECT user_id, first_name, last_name FROM students
    UNION ALL
    SELECT user_id, first_name, last_name FROM instructors
    UNION ALL
    SELECT user_id, first_name, last_name FROM admins
  ) profile ON u.uuid = profile.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as enrolled, COUNT(*) as completed
    FROM enrol
    GROUP BY user_id
  ) course_stats ON u.uuid = course_stats.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total_certs
    FROM student_certificates
    GROUP BY user_id
  ) cert_stats ON u.uuid = cert_stats.user_id
  LEFT JOIN user_points points ON u.uuid = points.user_id
  WHERE u.is_deleted = 0
    AND (p_from_date IS NULL OR u.created_at >= p_from_date)
    AND (p_to_date IS NULL OR u.created_at <= p_to_date)
    AND (p_department IS NULL OR p_department = '' OR sci.department = p_department)
  ORDER BY u.created_at DESC;
END //

-- =============================================
-- Get Course Completion Report Data
-- =============================================
CREATE PROCEDURE sp_get_course_completion_report(
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  SELECT
    c.id as courseId,
    c.title as courseTitle,
    COALESCE(cat.category_name, 'Uncategorized') as category,
    COUNT(DISTINCT e.user_id) as totalEnrollments,
    COUNT(DISTINCT CASE WHEN e.last_updated IS NOT NULL THEN e.user_id END) as completedCount,
    ROUND(
      COUNT(DISTINCT CASE WHEN e.last_updated IS NOT NULL THEN e.user_id END) * 100.0 /
      NULLIF(COUNT(DISTINCT e.user_id), 0),
      1
    ) as completionRate,
    COALESCE(AVG(cp.time_spent), 0) as avgTimeSpentMinutes,
    c.course_duration as courseDuration
  FROM course c
  LEFT JOIN enrol e ON c.id = e.course_id
  LEFT JOIN category cat ON c.category_id = cat.id
  LEFT JOIN course_progress cp ON e.id = cp.enroll_id
  WHERE c.is_deleted = 0
    AND (p_from_date IS NULL OR e.enrolled_date >= p_from_date)
    AND (p_to_date IS NULL OR e.enrolled_date <= p_to_date)
  GROUP BY c.id, c.title, cat.category_name, c.course_duration
  ORDER BY completionRate DESC;
END //

-- =============================================
-- Get Learning Engagement Report Data
-- =============================================
CREATE PROCEDURE sp_get_learning_engagement_report(
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  -- Summary stats
  SELECT
    COUNT(DISTINCT u.uuid) as totalActiveUsers,
    COUNT(DISTINCT e.user_id) as usersWithEnrollments,
    COUNT(DISTINCT e.id) as totalEnrollments,
    COALESCE(SUM(cp.time_spent), 0) as totalTimeSpentMinutes,
    ROUND(COALESCE(AVG(cp.time_spent), 0), 1) as avgTimePerUser,
    COUNT(DISTINCT CASE WHEN u.updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN u.uuid END) as activeLastWeek
  FROM users u
  LEFT JOIN enrol e ON u.uuid = e.user_id
  LEFT JOIN course_progress cp ON e.id = cp.enroll_id
  WHERE u.is_deleted = 0
    AND (p_from_date IS NULL OR u.updated_at >= p_from_date)
    AND (p_to_date IS NULL OR u.updated_at <= p_to_date);
END //

DELIMITER ;
