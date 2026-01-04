-- =============================================
-- Admin User Management Procedures
-- =============================================

-- Create deactivation log table
CREATE TABLE IF NOT EXISTS user_deactivation_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(200),
  department VARCHAR(255),
  deactivated_by VARCHAR(36) NOT NULL,
  deactivated_by_name VARCHAR(200),
  reason VARCHAR(500),
  deactivated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reactivated_at TIMESTAMP NULL,
  reactivated_by VARCHAR(36) NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_deactivated_at (deactivated_at)
);

-- =============================================
-- DROP existing procedures if they exist
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_all_users;
DROP PROCEDURE IF EXISTS sp_get_user_stats;
DROP PROCEDURE IF EXISTS sp_get_user_by_id;
DROP PROCEDURE IF EXISTS sp_create_user;
DROP PROCEDURE IF EXISTS sp_update_user;
DROP PROCEDURE IF EXISTS sp_deactivate_user;
DROP PROCEDURE IF EXISTS sp_reactivate_user;
DROP PROCEDURE IF EXISTS sp_get_deactivation_log;

DELIMITER //

-- =============================================
-- Get all users (unified list) with pagination and filtering
-- =============================================
CREATE PROCEDURE sp_get_all_users(
  IN p_search VARCHAR(100),
  IN p_status VARCHAR(20),
  IN p_department VARCHAR(100),
  IN p_role VARCHAR(20),
  IN p_page INT,
  IN p_limit INT
)
BEGIN
  DECLARE v_offset INT;
  SET v_offset = (COALESCE(p_page, 1) - 1) * COALESCE(p_limit, 10);
  SET p_limit = COALESCE(p_limit, 10);

  -- Get total count first
  SELECT COUNT(*) as total_count FROM (
    -- Students
    SELECT u.uuid
    FROM users u
    INNER JOIN students s ON u.uuid = s.user_id
    LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
    WHERE u.is_deleted = 0
      AND (p_search IS NULL OR p_search = '' OR
           CONCAT(s.first_name, ' ', s.last_name) LIKE CONCAT('%', p_search, '%') OR
           u.email LIKE CONCAT('%', p_search, '%'))
      AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR u.status = p_status)
      AND (p_department IS NULL OR p_department = '' OR p_department = 'All Department' OR sci.department = p_department)
      AND (p_role IS NULL OR p_role = '' OR p_role = 'All Roles' OR p_role = 'student')

    UNION ALL

    -- Instructors
    SELECT u.uuid
    FROM users u
    INNER JOIN instructors i ON u.uuid = i.user_id
    WHERE u.is_deleted = 0
      AND (p_search IS NULL OR p_search = '' OR
           CONCAT(i.first_name, ' ', i.last_name) LIKE CONCAT('%', p_search, '%') OR
           u.email LIKE CONCAT('%', p_search, '%'))
      AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR u.status = p_status)
      AND (p_department IS NULL OR p_department = '' OR p_department = 'All Department')
      AND (p_role IS NULL OR p_role = '' OR p_role = 'All Roles' OR p_role = 'instructor')

    UNION ALL

    -- Admins
    SELECT u.uuid
    FROM users u
    INNER JOIN admins a ON u.uuid = a.user_id
    WHERE u.is_deleted = 0
      AND (p_search IS NULL OR p_search = '' OR
           CONCAT(a.first_name, ' ', a.last_name) LIKE CONCAT('%', p_search, '%') OR
           u.email LIKE CONCAT('%', p_search, '%'))
      AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR u.status = p_status)
      AND (p_department IS NULL OR p_department = '' OR p_department = 'All Department')
      AND (p_role IS NULL OR p_role = '' OR p_role = 'All Roles' OR p_role = 'admin')
  ) as count_query;

  -- Get paginated results
  SELECT
    u.uuid as id,
    CONCAT(profile.first_name, ' ', profile.last_name) as name,
    UPPER(CONCAT(LEFT(profile.first_name, 1), LEFT(profile.last_name, 1))) as initials,
    u.email,
    CASE u.role_id
      WHEN 1 THEN 'student'
      WHEN 2 THEN 'instructor'
      WHEN 3 THEN 'admin'
    END as role,
    COALESCE(sci.department, 'N/A') as department,
    COALESCE(sci.designation, sci.job_profile, 'N/A') as jobTitle,
    CASE
      WHEN u.status = 'active' THEN 'Active'
      ELSE 'Inactive'
    END as status,
    u.updated_at as lastLogin,
    COALESCE(course_stats.enrolled, 0) as coursesActive,
    0 as coursesCompleted,
    u.created_at as createdAt,
    profile.dp as avatar,
    profile.contact as phone,
    profile.city as location,
    sci.manager_name as manager
  FROM users u
  LEFT JOIN (
    SELECT user_id, first_name, last_name, dp, contact, city FROM students
    UNION ALL
    SELECT user_id, first_name, last_name, dp, contact, city FROM instructors
    UNION ALL
    SELECT user_id, first_name, last_name, dp, contact, city FROM admins
  ) profile ON u.uuid = profile.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as enrolled FROM enrol GROUP BY user_id
  ) course_stats ON u.uuid = course_stats.user_id
  WHERE u.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR
         CONCAT(profile.first_name, ' ', profile.last_name) LIKE CONCAT('%', p_search, '%') OR
         u.email LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR u.status = p_status)
    AND (p_department IS NULL OR p_department = '' OR p_department = 'All Department' OR sci.department = p_department)
    AND (p_role IS NULL OR p_role = '' OR p_role = 'All Roles' OR
         (p_role = 'student' AND u.role_id = 1) OR
         (p_role = 'instructor' AND u.role_id = 2) OR
         (p_role = 'admin' AND u.role_id = 3))
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET v_offset;
END //

-- =============================================
-- Get user statistics
-- =============================================
CREATE PROCEDURE sp_get_user_stats()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM users WHERE is_deleted = 0) as totalUsers,
    (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND status = 'active') as activeUsers,
    (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND status != 'active') as inactiveUsers,
    (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as newThisMonth;
END //

-- =============================================
-- Get single user by ID
-- =============================================
CREATE PROCEDURE sp_get_user_by_id(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    u.uuid as id,
    CONCAT(profile.first_name, ' ', profile.last_name) as name,
    profile.first_name as firstName,
    profile.last_name as lastName,
    UPPER(CONCAT(LEFT(profile.first_name, 1), LEFT(profile.last_name, 1))) as initials,
    u.email,
    CASE u.role_id
      WHEN 1 THEN 'student'
      WHEN 2 THEN 'instructor'
      WHEN 3 THEN 'admin'
    END as role,
    u.role_id as roleId,
    COALESCE(sci.department, 'N/A') as department,
    COALESCE(sci.designation, sci.job_profile, 'N/A') as jobTitle,
    CASE
      WHEN u.status = 'active' THEN 'Active'
      ELSE 'Inactive'
    END as status,
    u.updated_at as lastLogin,
    u.created_at as joinDate,
    profile.dp as avatar,
    profile.contact as phone,
    profile.city as location,
    profile.address,
    profile.city,
    profile.state,
    profile.country,
    sci.manager_name as manager,
    sci.organization_name as organization,
    0 as coursesCompleted,
    COALESCE(course_stats.enrolled, 0) as coursesActive,
    COALESCE(course_stats.enrolled, 0) as totalCourses
  FROM users u
  LEFT JOIN (
    SELECT user_id, first_name, last_name, dp, contact, city, address, state, country FROM students
    UNION ALL
    SELECT user_id, first_name, last_name, dp, contact, city, address, state, country FROM instructors
    UNION ALL
    SELECT user_id, first_name, last_name, dp, contact, city, address, state, country FROM admins
  ) profile ON u.uuid = profile.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as enrolled FROM enrol GROUP BY user_id
  ) course_stats ON u.uuid = course_stats.user_id
  WHERE u.uuid = p_user_id AND u.is_deleted = 0;
END //

-- =============================================
-- Create a new user
-- =============================================
CREATE PROCEDURE sp_create_user(
  IN p_uuid VARCHAR(36),
  IN p_email VARCHAR(255),
  IN p_password VARCHAR(255),
  IN p_role VARCHAR(20),
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_department VARCHAR(255),
  IN p_job_title VARCHAR(255),
  IN p_instance VARCHAR(100)
)
BEGIN
  DECLARE v_role_id INT;
  DECLARE v_error_message VARCHAR(500);

  -- Determine role_id
  SET v_role_id = CASE p_role
    WHEN 'student' THEN 1
    WHEN 'instructor' THEN 2
    WHEN 'admin' THEN 3
    ELSE 1
  END;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email already exists';
  END IF;

  -- Start transaction
  START TRANSACTION;

  -- Insert into users table
  INSERT INTO users (uuid, email, password, role_id, status, instance, created_at, updated_at)
  VALUES (p_uuid, p_email, p_password, v_role_id, 'active', p_instance, NOW(), NOW());

  -- Insert into role-specific table
  IF v_role_id = 1 THEN
    INSERT INTO students (user_id, first_name, last_name)
    VALUES (p_uuid, p_first_name, p_last_name);

    -- Insert corporate info if department provided
    IF p_department IS NOT NULL AND p_department != '' THEN
      INSERT INTO student_corporate_info (user_id, department, job_profile, designation)
      VALUES (p_uuid, p_department, p_job_title, p_job_title);
    END IF;

  ELSEIF v_role_id = 2 THEN
    INSERT INTO instructors (user_id, first_name, last_name)
    VALUES (p_uuid, p_first_name, p_last_name);

  ELSEIF v_role_id = 3 THEN
    INSERT INTO admins (user_id, first_name, last_name)
    VALUES (p_uuid, p_first_name, p_last_name);
  END IF;

  COMMIT;

  SELECT 1 as success, 'User created successfully' as message, p_uuid as userId;
END //

-- =============================================
-- Update user
-- =============================================
CREATE PROCEDURE sp_update_user(
  IN p_user_id VARCHAR(36),
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_department VARCHAR(255),
  IN p_job_title VARCHAR(255),
  IN p_status VARCHAR(20)
)
BEGIN
  DECLARE v_role_id INT;

  -- Get user's role
  SELECT role_id INTO v_role_id FROM users WHERE uuid = p_user_id;

  -- Update status if provided
  IF p_status IS NOT NULL AND p_status != '' THEN
    UPDATE users SET status = LOWER(p_status), updated_at = NOW() WHERE uuid = p_user_id;
  END IF;

  -- Update role-specific table
  IF v_role_id = 1 THEN
    UPDATE students SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name)
    WHERE user_id = p_user_id;

    -- Update or insert corporate info
    INSERT INTO student_corporate_info (user_id, department, designation, job_profile)
    VALUES (p_user_id, p_department, p_job_title, p_job_title)
    ON DUPLICATE KEY UPDATE
      department = COALESCE(p_department, department),
      designation = COALESCE(p_job_title, designation),
      job_profile = COALESCE(p_job_title, job_profile);

  ELSEIF v_role_id = 2 THEN
    UPDATE instructors SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name)
    WHERE user_id = p_user_id;

  ELSEIF v_role_id = 3 THEN
    UPDATE admins SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name)
    WHERE user_id = p_user_id;
  END IF;

  SELECT 1 as success, 'User updated successfully' as message;
END //

-- =============================================
-- Deactivate user
-- =============================================
CREATE PROCEDURE sp_deactivate_user(
  IN p_user_id VARCHAR(36),
  IN p_deactivated_by VARCHAR(36),
  IN p_reason VARCHAR(500)
)
BEGIN
  DECLARE v_user_name VARCHAR(200);
  DECLARE v_department VARCHAR(255);
  DECLARE v_deactivated_by_name VARCHAR(200);

  -- Get user name
  SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
  FROM (
    SELECT first_name, last_name FROM students WHERE user_id = p_user_id
    UNION ALL
    SELECT first_name, last_name FROM instructors WHERE user_id = p_user_id
    UNION ALL
    SELECT first_name, last_name FROM admins WHERE user_id = p_user_id
  ) names LIMIT 1;

  -- Get department
  SELECT department INTO v_department FROM student_corporate_info WHERE user_id = p_user_id;

  -- Get deactivated by name
  SELECT CONCAT(first_name, ' ', last_name) INTO v_deactivated_by_name
  FROM (
    SELECT first_name, last_name FROM students WHERE user_id = p_deactivated_by
    UNION ALL
    SELECT first_name, last_name FROM instructors WHERE user_id = p_deactivated_by
    UNION ALL
    SELECT first_name, last_name FROM admins WHERE user_id = p_deactivated_by
  ) names LIMIT 1;

  -- Update user status
  UPDATE users SET status = 'inactive', updated_at = NOW() WHERE uuid = p_user_id;

  -- Log deactivation
  INSERT INTO user_deactivation_log (user_id, user_name, department, deactivated_by, deactivated_by_name, reason)
  VALUES (p_user_id, v_user_name, v_department, p_deactivated_by, v_deactivated_by_name, p_reason);

  SELECT 1 as success, 'User deactivated successfully' as message;
END //

-- =============================================
-- Reactivate user
-- =============================================
CREATE PROCEDURE sp_reactivate_user(
  IN p_user_id VARCHAR(36),
  IN p_reactivated_by VARCHAR(36)
)
BEGIN
  -- Update user status
  UPDATE users SET status = 'active', updated_at = NOW() WHERE uuid = p_user_id;

  -- Update deactivation log
  UPDATE user_deactivation_log
  SET reactivated_at = NOW(), reactivated_by = p_reactivated_by
  WHERE user_id = p_user_id AND reactivated_at IS NULL
  ORDER BY deactivated_at DESC
  LIMIT 1;

  SELECT 1 as success, 'User reactivated successfully' as message;
END //

-- =============================================
-- Get deactivation log
-- =============================================
CREATE PROCEDURE sp_get_deactivation_log(
  IN p_page INT,
  IN p_limit INT
)
BEGIN
  DECLARE v_offset INT;
  SET v_offset = (COALESCE(p_page, 1) - 1) * COALESCE(p_limit, 10);
  SET p_limit = COALESCE(p_limit, 10);

  -- Get total count
  SELECT COUNT(*) as total_count FROM user_deactivation_log WHERE reactivated_at IS NULL;

  -- Get paginated results
  SELECT
    dl.id,
    dl.user_id as userId,
    dl.user_name as userName,
    COALESCE(dl.department, 'N/A') as department,
    dl.deactivated_by_name as deactivatedBy,
    dl.deactivated_at as deactivatedDate,
    dl.reason,
    dl.reactivated_at as reactivatedAt
  FROM user_deactivation_log dl
  WHERE dl.reactivated_at IS NULL
  ORDER BY dl.deactivated_at DESC
  LIMIT p_limit OFFSET v_offset;
END //

-- =============================================
-- Get distinct departments for filter dropdown
-- =============================================
CREATE PROCEDURE sp_get_departments()
BEGIN
  SELECT DISTINCT department
  FROM student_corporate_info
  WHERE department IS NOT NULL AND department != ''
  ORDER BY department;
END //

DELIMITER ;
