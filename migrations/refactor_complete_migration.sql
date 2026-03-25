-- =============================================
-- Complete Migration for Refactored Features
-- Features: Sections & Lessons, Custom Report Builder, Analytics
-- Date: 2026-03-25
-- =============================================

-- =============================================
-- 1. COURSE MANAGEMENT TABLES
-- =============================================

-- Course Categories
CREATE TABLE IF NOT EXISTS course_category (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_name (name)
);

-- Course Subcategories
CREATE TABLE IF NOT EXISTS course_subcategory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  description TEXT,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_category (category_id)
);

-- Languages
CREATE TABLE IF NOT EXISTS language (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0
);

-- Main Course Table
CREATE TABLE IF NOT EXISTS course (
  id INT PRIMARY KEY AUTO_INCREMENT,
  creator_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  instructor VARCHAR(255),
  short_description TEXT,
  description TEXT,
  language_id INT NOT NULL,
  category_id INT NOT NULL,
  sub_category_id INT NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  course_duration VARCHAR(100),
  thumbnail VARCHAR(500),
  course_overview_provider VARCHAR(50),
  course_overview_video_url VARCHAR(500),
  meta_keywords TEXT,
  meta_description TEXT,
  status ENUM('draft', 'pending', 'published', 'archived') DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_creator (creator_id),
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_level (level),
  INDEX idx_created (created_at)
);

-- Course Sections
CREATE TABLE IF NOT EXISTS course_section (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  section_order INT DEFAULT 0,
  creator_id VARCHAR(36),
  last_updated_by VARCHAR(36),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_course (course_id),
  INDEX idx_order (section_order)
);

-- Course Lessons
CREATE TABLE IF NOT EXISTS course_lesson (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  lesson_type ENUM('ILTS', 'Content-Based') NOT NULL DEFAULT 'Content-Based',
  lesson_order INT DEFAULT 0,

  -- Content-Based fields
  lesson_content_type ENUM('document', 'scorm', 'mp4', 'url', 'quiz') NULL,
  lesson_content_document VARCHAR(500),
  lesson_content_scorm VARCHAR(500),
  lesson_content_mp4 VARCHAR(500),
  lesson_content_url VARCHAR(1000),
  lesson_duration VARCHAR(100),
  description TEXT,
  skills TEXT,

  -- Quiz/Assessment fields
  assessment_id INT NULL,
  require_section_completion TINYINT(1) DEFAULT 0,
  assessment_start_date DATE NULL,
  assessment_end_date DATE NULL,

  -- ILTS fields
  ilts_type ENUM('Online', 'Offline') NULL,
  ilts_url VARCHAR(1000),
  start_date DATE,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  event_venue VARCHAR(500),
  meet_url VARCHAR(1000),

  creator_id VARCHAR(36),
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,

  INDEX idx_course (course_id),
  INDEX idx_section (section_id),
  INDEX idx_type (lesson_type),
  INDEX idx_order (lesson_order)
);

-- ILTS Sessions
CREATE TABLE IF NOT EXISTS ilts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  lesson_mode ENUM('Online', 'Offline') DEFAULT 'Online',
  meet_url VARCHAR(1000),
  venue VARCHAR(500),
  start_date DATE,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  creator_id VARCHAR(36),
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course (course_id),
  INDEX idx_lesson (lesson_id)
);

-- Course Outcomes
CREATE TABLE IF NOT EXISTS course_outcomes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  outcome TEXT NOT NULL,
  course_id INT NOT NULL,
  creator_id VARCHAR(36),
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course (course_id)
);

-- Course Requirements
CREATE TABLE IF NOT EXISTS course_requirements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requirement TEXT NOT NULL,
  course_id INT NOT NULL,
  creator_id VARCHAR(36),
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course (course_id)
);

-- Course FAQs
CREATE TABLE IF NOT EXISTS course_faq (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  course_id INT NOT NULL,
  creator_id VARCHAR(36),
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course (course_id)
);

-- =============================================
-- 2. ENROLLMENT & PROGRESS TABLES
-- =============================================

-- Course Enrollments
CREATE TABLE IF NOT EXISTS enrol (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  course_id INT NOT NULL,
  enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress INT DEFAULT 0,
  status ENUM('enrolled', 'in_progress', 'completed', 'dropped') DEFAULT 'enrolled',
  completed_at TIMESTAMP NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  UNIQUE KEY unique_enrollment (user_id, course_id),
  INDEX idx_user (user_id),
  INDEX idx_course (course_id),
  INDEX idx_status (status),
  INDEX idx_enrolled_date (enrolled_date)
);

-- Lesson Progress Tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  progress INT DEFAULT 0,
  completed_at TIMESTAMP NULL,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  UNIQUE KEY unique_lesson_progress (user_id, lesson_id),
  INDEX idx_user (user_id),
  INDEX idx_course (course_id),
  INDEX idx_lesson (lesson_id),
  INDEX idx_status (status),
  INDEX idx_completed (completed_at)
);

-- Course Progress (per enrollment per lesson)
CREATE TABLE IF NOT EXISTS course_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  enroll_id INT NOT NULL,
  lesson_id INT NOT NULL,
  lesson_completed TINYINT(1) DEFAULT 0,
  time_spent DECIMAL(10,2) DEFAULT 0,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enroll (enroll_id),
  INDEX idx_lesson (lesson_id)
);

-- =============================================
-- 3. USER & PROFILE TABLES (referenced by reports)
-- =============================================

-- Student Corporate Info
CREATE TABLE IF NOT EXISTS student_corporate_info (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  job_profile VARCHAR(255),
  designation VARCHAR(255),
  department VARCHAR(255),
  employee_id VARCHAR(100),
  organization_name VARCHAR(255),
  location VARCHAR(255),
  manager_name VARCHAR(255),
  manager_email VARCHAR(255),
  manager_contact VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_department (department)
);

-- User Points (Gamification)
CREATE TABLE IF NOT EXISTS user_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  total_points INT DEFAULT 0,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_points (total_points)
);

-- Student Certificates
CREATE TABLE IF NOT EXISTS student_certificates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  certificate_name VARCHAR(255),
  certificate_file VARCHAR(500),
  issued_date DATE,
  expiry_date DATE,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_issued (issued_date),
  INDEX idx_certificate_name (certificate_name)
);

-- User Login Log (for analytics)
CREATE TABLE IF NOT EXISTS user_login_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  login_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  INDEX idx_user (user_id),
  INDEX idx_login_date (login_date)
);

-- =============================================
-- 4. REPORT SCHEDULING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS report_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_type VARCHAR(50) NOT NULL DEFAULT 'analytics',
  frequency ENUM('daily', 'weekly', 'monthly') NOT NULL,
  day_of_week TINYINT NULL COMMENT '0=Sun, 6=Sat (for weekly)',
  day_of_month TINYINT NULL COMMENT '1-31 (for monthly)',
  time_of_day TIME NOT NULL DEFAULT '09:00:00',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  recipients JSON NOT NULL COMMENT 'Array of email addresses',
  report_format ENUM('pdf', 'xlsx', 'csv') DEFAULT 'pdf',
  is_active TINYINT(1) DEFAULT 1,
  created_by VARCHAR(36) NOT NULL,
  last_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_frequency (frequency),
  INDEX idx_created_by (created_by)
);

-- =============================================
-- 5. BATCH ASSIGNMENT TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS course_batch_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  batch_id INT NOT NULL,
  available_to_all TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_course (course_id),
  INDEX idx_batch (batch_id),
  UNIQUE KEY unique_course_batch (course_id, batch_id)
);

-- =============================================
-- 6. ALTER TABLES - Add missing columns if not present
--    (Safe to re-run: uses stored procedure to check existence)
-- =============================================

-- Helper procedure to add column if not exists
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_column_if_not_exists(
  IN p_table VARCHAR(100),
  IN p_column VARCHAR(100),
  IN p_definition VARCHAR(500)
)
BEGIN
  SET @col_exists = 0;
  SELECT COUNT(*) INTO @col_exists
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = p_table
    AND column_name = p_column;

  IF @col_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- course_section: ensure last_updated_by and last_updated exist
CALL add_column_if_not_exists('course_section', 'last_updated_by', "VARCHAR(36) DEFAULT NULL");
CALL add_column_if_not_exists('course_section', 'last_updated', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
CALL add_column_if_not_exists('course_section', 'created_date', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

-- course_lesson: ensure last_updated_by and last_updated exist
CALL add_column_if_not_exists('course_lesson', 'last_updated_by', "VARCHAR(36) DEFAULT NULL");
CALL add_column_if_not_exists('course_lesson', 'last_updated', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

-- course_lesson: ensure assessment fields exist
CALL add_column_if_not_exists('course_lesson', 'assessment_id', "INT NULL DEFAULT NULL");
CALL add_column_if_not_exists('course_lesson', 'require_section_completion', "TINYINT(1) DEFAULT 0");
CALL add_column_if_not_exists('course_lesson', 'assessment_start_date', "DATE NULL DEFAULT NULL");
CALL add_column_if_not_exists('course_lesson', 'assessment_end_date', "DATE NULL DEFAULT NULL");

-- course: ensure course_overview fields exist
CALL add_column_if_not_exists('course', 'course_overview_provider', "VARCHAR(50) DEFAULT NULL");
CALL add_column_if_not_exists('course', 'course_overview_video_url', "VARCHAR(500) DEFAULT NULL");
CALL add_column_if_not_exists('course', 'last_updated_by', "VARCHAR(36) DEFAULT NULL");
CALL add_column_if_not_exists('course', 'published_at', "TIMESTAMP NULL DEFAULT NULL");

-- enrol: ensure enrolled_date exists (legacy column name)
CALL add_column_if_not_exists('enrol', 'enrolled_date', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
CALL add_column_if_not_exists('enrol', 'last_updated', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

-- lesson_progress: ensure status column exists
CALL add_column_if_not_exists('lesson_progress', 'status', "ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started'");
CALL add_column_if_not_exists('lesson_progress', 'completed_at', "TIMESTAMP NULL DEFAULT NULL");

-- Cleanup helper procedure
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- =============================================
-- 7. DEFAULT DATA
-- =============================================

INSERT IGNORE INTO language (name, code) VALUES
  ('English', 'en'),
  ('Spanish', 'es'),
  ('French', 'fr'),
  ('German', 'de'),
  ('Hindi', 'hi'),
  ('Mandarin', 'zh');

-- =============================================
-- 8. STORED PROCEDURES (for analytics)
-- =============================================

-- Leaderboard
DROP PROCEDURE IF EXISTS sp_get_report_leaderboard;
DELIMITER //
CREATE PROCEDURE sp_get_report_leaderboard(
  IN p_instructor_id VARCHAR(36),
  IN p_limit INT
)
BEGIN
  SET p_limit = COALESCE(p_limit, 50);

  SELECT
    CONCAT(profile.first_name, ' ', profile.last_name) AS name,
    u.email,
    COALESCE(sci.department, 'N/A') AS department,
    COALESCE(up.total_points, 0) AS points,
    COALESCE(up.xp, 0) AS xp,
    COALESCE(up.level, 1) AS level,
    CASE
      WHEN COALESCE(up.total_points, 0) >= 15000 THEN 'Level 4'
      WHEN COALESCE(up.total_points, 0) >= 10000 THEN 'Level 3'
      WHEN COALESCE(up.total_points, 0) >= 5000 THEN 'Level 2'
      ELSE 'Level 1'
    END AS levelName,
    COALESCE(cs.completed, 0) AS coursesCompleted,
    COALESCE(ct.total_certs, 0) AS certificates,
    COALESCE(up.current_streak, 0) AS streak
  FROM users u
  LEFT JOIN (
    SELECT user_id, first_name, last_name FROM students
    UNION ALL SELECT user_id, first_name, last_name FROM instructors
    UNION ALL SELECT user_id, first_name, last_name FROM admins
  ) profile ON u.uuid = profile.user_id
  LEFT JOIN user_points up ON u.uuid = up.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS completed
    FROM enrol WHERE status = 'completed'
    GROUP BY user_id
  ) cs ON u.uuid = cs.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS total_certs
    FROM student_certificates
    GROUP BY user_id
  ) ct ON u.uuid = ct.user_id
  WHERE u.is_deleted = 0
    AND (p_instructor_id IS NULL OR u.uuid IN (
      SELECT DISTINCT e.user_id FROM enrol e
      INNER JOIN course c ON e.course_id = c.id
      WHERE c.creator_id = p_instructor_id
    ))
  ORDER BY COALESCE(up.total_points, 0) DESC
  LIMIT p_limit;
END //
DELIMITER ;

-- Department Performance
DROP PROCEDURE IF EXISTS sp_get_department_performance;
DELIMITER //
CREATE PROCEDURE sp_get_department_performance(
  IN p_instructor_id VARCHAR(36)
)
BEGIN
  SELECT
    COALESCE(sci.department, 'Unassigned') AS department,
    COUNT(DISTINCT u.uuid) AS totalUsers,
    COALESCE(ROUND(AVG(COALESCE(up.total_points, 0)), 0), 0) AS avgPoints,
    COALESCE(SUM(cs.completed), 0) AS totalCompletions,
    ROUND(
      COALESCE(SUM(cs.completed), 0) * 100.0 /
      NULLIF(COUNT(DISTINCT u.uuid), 0),
      0
    ) AS completionRate
  FROM users u
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN user_points up ON u.uuid = up.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS completed
    FROM enrol WHERE status = 'completed'
    GROUP BY user_id
  ) cs ON u.uuid = cs.user_id
  WHERE u.is_deleted = 0
    AND u.role_id = 1
    AND (p_instructor_id IS NULL OR u.uuid IN (
      SELECT DISTINCT e.user_id FROM enrol e
      INNER JOIN course c ON e.course_id = c.id
      WHERE c.creator_id = p_instructor_id
    ))
  GROUP BY COALESCE(sci.department, 'Unassigned')
  ORDER BY avgPoints DESC;
END //
DELIMITER ;

-- Completion Trends (6 months)
DROP PROCEDURE IF EXISTS sp_get_completion_trends;
DELIMITER //
CREATE PROCEDURE sp_get_completion_trends(
  IN p_instructor_id VARCHAR(36)
)
BEGIN
  SELECT
    DATE_FORMAT(months.month_start, '%b %Y') AS month,
    COALESCE(enr.enrollments, 0) AS enrollments,
    COALESCE(comp.completions, 0) AS completions
  FROM (
    SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m-01') AS month_start
    FROM (
      SELECT 0 AS n UNION SELECT 1 UNION SELECT 2
      UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    ) numbers
  ) months
  LEFT JOIN (
    SELECT DATE_FORMAT(enrolled_date, '%Y-%m-01') AS month_start,
           COUNT(*) AS enrollments
    FROM enrol e
    WHERE enrolled_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      AND (p_instructor_id IS NULL OR e.course_id IN (
        SELECT id FROM course WHERE creator_id = p_instructor_id
      ))
    GROUP BY DATE_FORMAT(enrolled_date, '%Y-%m-01')
  ) enr ON months.month_start = enr.month_start
  LEFT JOIN (
    SELECT DATE_FORMAT(completed_at, '%Y-%m-01') AS month_start,
           COUNT(*) AS completions
    FROM enrol e
    WHERE status = 'completed'
      AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      AND (p_instructor_id IS NULL OR e.course_id IN (
        SELECT id FROM course WHERE creator_id = p_instructor_id
      ))
    GROUP BY DATE_FORMAT(completed_at, '%Y-%m-01')
  ) comp ON months.month_start = comp.month_start
  ORDER BY months.month_start ASC;
END //
DELIMITER ;

-- Skills Assessment
DROP PROCEDURE IF EXISTS sp_get_skills_assessment;
DELIMITER //
CREATE PROCEDURE sp_get_skills_assessment(
  IN p_instructor_id VARCHAR(36)
)
BEGIN
  SELECT
    COALESCE(cc.name, 'General') AS skill,
    ROUND(AVG(COALESCE(e.progress, 0)), 0) AS avgScore,
    COUNT(DISTINCT e.user_id) AS usersAssessed
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  LEFT JOIN course_category cc ON c.category_id = cc.id
  WHERE c.is_deleted = 0
    AND (p_instructor_id IS NULL OR c.creator_id = p_instructor_id)
  GROUP BY COALESCE(cc.name, 'General')
  ORDER BY avgScore DESC
  LIMIT 6;
END //
DELIMITER ;

-- User Report Data
DROP PROCEDURE IF EXISTS sp_get_user_report_data;
DELIMITER //
CREATE PROCEDURE sp_get_user_report_data(
  IN p_instructor_id VARCHAR(36),
  IN p_from_date DATE,
  IN p_to_date DATE,
  IN p_department VARCHAR(255)
)
BEGIN
  SELECT
    CONCAT(profile.first_name, ' ', profile.last_name) AS name,
    u.email,
    COALESCE(sci.department, 'N/A') AS department,
    COALESCE(sci.designation, 'N/A') AS jobTitle,
    u.status,
    COALESCE(cs.total_courses, 0) AS coursesEnrolled,
    COALESCE(up.total_points, 0) AS points
  FROM users u
  LEFT JOIN (
    SELECT user_id, first_name, last_name FROM students
    UNION ALL SELECT user_id, first_name, last_name FROM instructors
    UNION ALL SELECT user_id, first_name, last_name FROM admins
  ) profile ON u.uuid = profile.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN user_points up ON u.uuid = up.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS total_courses FROM enrol GROUP BY user_id
  ) cs ON u.uuid = cs.user_id
  WHERE u.is_deleted = 0
    AND u.role_id = 1
    AND (p_from_date IS NULL OR u.created_at >= p_from_date)
    AND (p_to_date IS NULL OR u.created_at <= p_to_date)
    AND (p_department IS NULL OR sci.department = p_department)
    AND (p_instructor_id IS NULL OR u.uuid IN (
      SELECT DISTINCT e.user_id FROM enrol e
      INNER JOIN course c ON e.course_id = c.id
      WHERE c.creator_id = p_instructor_id
    ))
  ORDER BY points DESC;
END //
DELIMITER ;

-- Learning Engagement Report
DROP PROCEDURE IF EXISTS sp_get_learning_engagement_report;
DELIMITER //
CREATE PROCEDURE sp_get_learning_engagement_report(
  IN p_instructor_id VARCHAR(36),
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  SELECT
    (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND role_id = 1) AS totalActiveUsers,
    (SELECT COUNT(DISTINCT user_id) FROM enrol
     WHERE (p_from_date IS NULL OR enrolled_date >= p_from_date)
       AND (p_to_date IS NULL OR enrolled_date <= p_to_date)
    ) AS usersWithEnrollments,
    (SELECT COUNT(*) FROM enrol
     WHERE (p_from_date IS NULL OR enrolled_date >= p_from_date)
       AND (p_to_date IS NULL OR enrolled_date <= p_to_date)
    ) AS totalEnrollments,
    COALESCE((SELECT ROUND(SUM(cp.time_spent), 0) FROM course_progress cp), 0) AS totalTimeSpentMinutes,
    COALESCE((
      SELECT ROUND(SUM(cp.time_spent) / NULLIF(COUNT(DISTINCT e.user_id), 0), 1)
      FROM course_progress cp
      INNER JOIN enrol e ON cp.enroll_id = e.id
    ), 0) AS avgTimePerUser,
    (SELECT COUNT(DISTINCT user_id) FROM user_login_log
     WHERE login_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    ) AS activeLastWeek;
END //
DELIMITER ;

-- =============================================
-- 9. INDEXES FOR ANALYTICS PERFORMANCE
-- =============================================

-- These are safe to run even if they already exist (will error silently)

-- Speed up enrollment date filtering
-- ALTER TABLE enrol ADD INDEX IF NOT EXISTS idx_enrolled_date (enrolled_date);

-- Speed up login activity queries
-- ALTER TABLE user_login_log ADD INDEX IF NOT EXISTS idx_login_date (login_date);

-- Speed up lesson progress completion queries
-- ALTER TABLE lesson_progress ADD INDEX IF NOT EXISTS idx_status_completed (status, completed_at);

-- Speed up certificate distribution queries
-- ALTER TABLE student_certificates ADD INDEX IF NOT EXISTS idx_cert_name (certificate_name);

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

SELECT 'Migration completed successfully' AS status;
