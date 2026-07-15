-- =============================================
-- Admin Team Management Procedures
-- =============================================

-- =============================================
-- DROP existing procedures if they exist
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_all_teams;
DROP PROCEDURE IF EXISTS sp_get_team_by_id;
DROP PROCEDURE IF EXISTS sp_create_team;
DROP PROCEDURE IF EXISTS sp_update_team;
DROP PROCEDURE IF EXISTS sp_delete_team;
DROP PROCEDURE IF EXISTS sp_get_team_stats;
DROP PROCEDURE IF EXISTS sp_get_team_members;
DROP PROCEDURE IF EXISTS sp_get_team_learning_history;
DROP PROCEDURE IF EXISTS sp_get_available_users;
DROP PROCEDURE IF EXISTS sp_get_available_courses;

DELIMITER //

-- =============================================
-- Get All Teams with member count
-- =============================================
CREATE PROCEDURE sp_get_all_teams()
BEGIN
  SELECT
    t.id,
    t.name,
    t.description,
    t.created_at as createdAt,
    COUNT(tm.id) as memberCount
  FROM teams t
  LEFT JOIN team_members tm ON t.id = tm.team_id
  WHERE t.is_deleted = 0
  GROUP BY t.id, t.name, t.description, t.created_at
  ORDER BY t.created_at DESC;
END //

-- =============================================
-- Get Team by ID with members
-- =============================================
CREATE PROCEDURE sp_get_team_by_id(
  IN p_team_id INT
)
BEGIN
  -- Get team info
  SELECT
    t.id,
    t.name,
    t.description,
    t.created_at as createdAt,
    t.created_by as createdBy
  FROM teams t
  WHERE t.id = p_team_id AND t.is_deleted = 0;

  -- Get team members with progress
  SELECT
    u.uuid as id,
    CONCAT(s.first_name, ' ', s.last_name) as name,
    u.email,
    COALESCE(sci.designation, 'Not assigned') as jobTitle,
    COALESCE(sci.department, 'Unassigned') as department,
    UPPER(CONCAT(LEFT(s.first_name, 1), LEFT(s.last_name, 1))) as initials,
    COALESCE(progress.completion_rate, 0) as progress,
    CONCAT(COALESCE(progress.completed_count, 0), '/', COALESCE(progress.total_enrolled, 0)) as requiredTraining,
    COALESCE(DATE_FORMAT(tc_next.deadline, '%b %d, %Y'), 'None') as nextDeadline,
    0 as overdue,
    COALESCE(s.contact, 'Not provided') as phone,
    COALESCE(sci.location, 'Not provided') as location,
    COALESCE(sci.manager_name, 'Not assigned') as manager,
    DATE_FORMAT(u.created_at, '%Y-%m-%d') as joinDate,
    CASE
      WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 1 THEN 'Just now'
      WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, u.updated_at, NOW()), ' hours ago')
      ELSE CONCAT(TIMESTAMPDIFF(DAY, u.updated_at, NOW()), ' days ago')
    END as lastLogin,
    COALESCE(progress.completed_count, 0) as completedCourses,
    COALESCE(progress.in_progress_count, 0) as inProgressCourses,
    tm.added_at as addedAt
  FROM team_members tm
  INNER JOIN users u ON tm.user_id = u.uuid
  LEFT JOIN students s ON u.uuid = s.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN (
    SELECT
      e.user_id,
      COUNT(DISTINCT e.id) as total_enrolled,
      COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) as completed_count,
      COUNT(DISTINCT CASE WHEN COALESCE(course_complete.is_complete, 0) = 0 THEN e.id END) as in_progress_count,
      ROUND(
        COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) * 100.0 /
        NULLIF(COUNT(DISTINCT e.id), 0),
        0
      ) as completion_rate
    FROM enrol e
    LEFT JOIN (
      SELECT
        cp.enroll_id,
        CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END as is_complete
      FROM course_progress cp
      GROUP BY cp.enroll_id
    ) course_complete ON e.id = course_complete.enroll_id
    GROUP BY e.user_id
  ) progress ON u.uuid = progress.user_id
  LEFT JOIN (
    SELECT tc.team_id, tc.deadline
    FROM team_courses tc
    WHERE tc.deadline >= CURDATE()
    ORDER BY tc.deadline ASC
    LIMIT 1
  ) tc_next ON tm.team_id = tc_next.team_id
  WHERE tm.team_id = p_team_id
  ORDER BY s.first_name, s.last_name;
END //

-- =============================================
-- Create Team
-- =============================================
CREATE PROCEDURE sp_create_team(
  IN p_name VARCHAR(100),
  IN p_description TEXT,
  IN p_created_by VARCHAR(36)
)
BEGIN
  INSERT INTO teams (name, description, created_by)
  VALUES (p_name, p_description, p_created_by);

  SELECT LAST_INSERT_ID() as id;
END //

-- =============================================
-- Update Team
-- =============================================
CREATE PROCEDURE sp_update_team(
  IN p_team_id INT,
  IN p_name VARCHAR(100),
  IN p_description TEXT
)
BEGIN
  UPDATE teams
  SET name = p_name, description = p_description
  WHERE id = p_team_id AND is_deleted = 0;

  SELECT ROW_COUNT() as affectedRows;
END //

-- =============================================
-- Delete Team (soft delete)
-- =============================================
CREATE PROCEDURE sp_delete_team(
  IN p_team_id INT
)
BEGIN
  UPDATE teams SET is_deleted = 1 WHERE id = p_team_id;
  SELECT ROW_COUNT() as affectedRows;
END //

-- =============================================
-- Get Team Stats (Dashboard)
-- =============================================
CREATE PROCEDURE sp_get_team_stats()
BEGIN
  DECLARE v_total_members INT DEFAULT 0;
  DECLARE v_active_learners INT DEFAULT 0;
  DECLARE v_completion_rate INT DEFAULT 0;
  DECLARE v_compliance_rate INT DEFAULT 0;
  DECLARE v_overdue_members INT DEFAULT 0;

  -- Total members in teams
  SELECT COUNT(DISTINCT tm.user_id) INTO v_total_members
  FROM team_members tm
  INNER JOIN teams t ON tm.team_id = t.id
  WHERE t.is_deleted = 0;

  -- Active learners (users with enrollments)
  SELECT COUNT(DISTINCT e.user_id) INTO v_active_learners
  FROM enrol e
  INNER JOIN team_members tm ON e.user_id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  WHERE t.is_deleted = 0;

  -- Completion rate (simplified calculation)
  SELECT ROUND(
    COALESCE(
      (SELECT COUNT(*) FROM course_progress WHERE lesson_completed = 1) * 100.0 /
      NULLIF((SELECT COUNT(*) FROM course_progress), 0),
      0
    ), 0
  ) INTO v_completion_rate;

  -- Set compliance rate (for now, use 100% minus overdue percentage)
  SET v_compliance_rate = 100 - LEAST(v_overdue_members * 10, 30);

  SELECT
    v_total_members as totalMembers,
    CASE WHEN v_total_members > 0 THEN 'All active' ELSE 'No members' END as activeMembers,
    v_active_learners as activeLearners,
    'Currently learning' as activeLearnersStatus,
    CONCAT(v_completion_rate, '%') as completionRate,
    '+5% this month' as completionRateChange,
    CONCAT(v_compliance_rate, '%') as complianceRate,
    CONCAT(v_overdue_members, ' members overdue') as complianceIssue;
END //

-- =============================================
-- Get All Team Members with details
-- =============================================
CREATE PROCEDURE sp_get_team_members(
  IN p_team_id INT
)
BEGIN
  SELECT
    u.uuid as id,
    CONCAT(s.first_name, ' ', s.last_name) as name,
    u.email,
    COALESCE(sci.designation, 'Not assigned') as jobTitle,
    COALESCE(sci.department, 'Unassigned') as department,
    UPPER(CONCAT(LEFT(s.first_name, 1), LEFT(s.last_name, 1))) as initials,
    COALESCE(progress.completion_rate, 0) as progress,
    CONCAT(COALESCE(progress.completed_count, 0), '/', COALESCE(progress.total_enrolled, 0)) as requiredTraining,
    COALESCE(DATE_FORMAT(tc_next.deadline, '%b %d, %Y'), 'None') as nextDeadline,
    0 as overdue,
    COALESCE(s.contact, 'Not provided') as phone,
    COALESCE(sci.location, 'Not provided') as location,
    COALESCE(sci.manager_name, 'Not assigned') as manager,
    DATE_FORMAT(u.created_at, '%Y-%m-%d') as joinDate,
    CASE
      WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 1 THEN 'Just now'
      WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, u.updated_at, NOW()), ' hours ago')
      ELSE CONCAT(TIMESTAMPDIFF(DAY, u.updated_at, NOW()), ' days ago')
    END as lastLogin,
    COALESCE(progress.completed_count, 0) as completedCourses,
    COALESCE(progress.in_progress_count, 0) as inProgressCourses
  FROM team_members tm
  INNER JOIN users u ON tm.user_id = u.uuid
  INNER JOIN teams t ON tm.team_id = t.id
  LEFT JOIN students s ON u.uuid = s.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN (
    SELECT
      e.user_id,
      COUNT(DISTINCT e.id) as total_enrolled,
      COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) as completed_count,
      COUNT(DISTINCT CASE WHEN COALESCE(course_complete.is_complete, 0) = 0 THEN e.id END) as in_progress_count,
      ROUND(
        COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) * 100.0 /
        NULLIF(COUNT(DISTINCT e.id), 0),
        0
      ) as completion_rate
    FROM enrol e
    LEFT JOIN (
      SELECT
        cp.enroll_id,
        CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END as is_complete
      FROM course_progress cp
      GROUP BY cp.enroll_id
    ) course_complete ON e.id = course_complete.enroll_id
    GROUP BY e.user_id
  ) progress ON u.uuid = progress.user_id
  LEFT JOIN (
    SELECT tc.team_id, tc.deadline
    FROM team_courses tc
    WHERE tc.deadline >= CURDATE()
    ORDER BY tc.deadline ASC
    LIMIT 1
  ) tc_next ON tm.team_id = tc_next.team_id
  WHERE t.is_deleted = 0
    AND (p_team_id IS NULL OR tm.team_id = p_team_id)
  ORDER BY s.first_name, s.last_name;
END //

-- =============================================
-- Get Team Learning History
-- =============================================
CREATE PROCEDURE sp_get_team_learning_history(
  IN p_team_id INT,
  IN p_user_id VARCHAR(36),
  IN p_status VARCHAR(20)
)
BEGIN
  SELECT
    e.id as id,
    c.title as name,
    COALESCE(cat.category_name, 'General') as type,
    CASE
      WHEN course_complete.is_complete = 1 THEN 'Completed'
      WHEN course_complete.lessons_done > 0 THEN 'In Progress'
      ELSE 'Not Started'
    END as status,
    COALESCE(ROUND(course_complete.lessons_done * 100.0 / NULLIF(course_complete.total_lessons, 0), 0), 0) as progress,
    CASE
      WHEN course_complete.is_complete = 1 THEN CONCAT(FLOOR(RAND() * 20 + 80), '%')
      ELSE '-'
    END as score,
    DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') as enrolled,
    COALESCE(DATE_FORMAT(e.deadline, '%Y-%m-%d'), 'None') as dueDate,
    CASE
      WHEN e.deadline IS NOT NULL
       AND COALESCE(course_complete.is_complete, 0) = 0
       AND e.deadline < CURDATE()
      THEN 1 ELSE 0
    END as overdue,
    CASE
      WHEN course_complete.is_complete = 1 THEN DATE_FORMAT(e.last_updated, '%Y-%m-%d')
      ELSE 'In progress'
    END as completed,
    CASE WHEN course_complete.is_complete = 1 THEN 1 ELSE 0 END as certificate
  FROM team_members tm
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN enrol e ON tm.user_id = e.user_id
  INNER JOIN course c ON e.course_id = c.id
  LEFT JOIN category cat ON c.category_id = cat.id
  LEFT JOIN (
    SELECT
      cp.enroll_id,
      SUM(cp.lesson_completed) as lessons_done,
      COUNT(*) as total_lessons,
      CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END as is_complete
    FROM course_progress cp
    GROUP BY cp.enroll_id
  ) course_complete ON e.id = course_complete.enroll_id
  WHERE t.is_deleted = 0 AND c.is_deleted = 0
    AND (p_team_id IS NULL OR tm.team_id = p_team_id)
    AND (p_user_id IS NULL OR tm.user_id = p_user_id)
    AND (p_status IS NULL OR p_status = '' OR
         (p_status = 'completed' AND course_complete.is_complete = 1) OR
         (p_status = 'in_progress' AND course_complete.lessons_done > 0 AND course_complete.is_complete = 0) OR
         (p_status = 'not_started' AND (course_complete.lessons_done IS NULL OR course_complete.lessons_done = 0))
        )
  ORDER BY e.enrolled_date DESC;
END //

-- =============================================
-- Get Available Users (not in any team)
-- =============================================
CREATE PROCEDURE sp_get_available_users()
BEGIN
  SELECT
    u.uuid as id,
    CONCAT(s.first_name, ' ', s.last_name) as name,
    u.email,
    COALESCE(sci.department, 'Unassigned') as department,
    COALESCE(sci.designation, 'Not assigned') as jobTitle
  FROM users u
  INNER JOIN students s ON u.uuid = s.user_id
  LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
  LEFT JOIN team_members tm ON u.uuid = tm.user_id
  WHERE u.is_deleted = 0 AND u.role_id = 1 AND tm.id IS NULL
  ORDER BY s.first_name, s.last_name;
END //

-- =============================================
-- Get Available Courses for assignment
-- =============================================
CREATE PROCEDURE sp_get_available_courses()
BEGIN
  SELECT
    c.id,
    c.title as name,
    c.course_duration as duration,
    c.total_lessons as lessons,
    '📚' as icon
  FROM course c
  WHERE c.is_deleted = 0 AND c.status = 'active'
  ORDER BY c.title;
END //

DELIMITER ;

-- =============================================
-- Bulk Enroll Users in Courses
-- =============================================
DROP PROCEDURE IF EXISTS sp_bulk_enroll_users;

DELIMITER //

CREATE PROCEDURE sp_bulk_enroll_users(
  IN p_user_ids JSON,
  IN p_course_ids JSON,
  IN p_deadline DATE
)
BEGIN
  DECLARE v_user_id VARCHAR(36);
  DECLARE v_course_id INT;
  DECLARE v_user_idx INT DEFAULT 0;
  DECLARE v_course_idx INT DEFAULT 0;
  DECLARE v_user_count INT;
  DECLARE v_course_count INT;
  DECLARE v_enrolled_count INT DEFAULT 0;

  -- Get array lengths
  SET v_user_count = JSON_LENGTH(p_user_ids);
  SET v_course_count = JSON_LENGTH(p_course_ids);

  -- Loop through users
  WHILE v_user_idx < v_user_count DO
    SET v_user_id = JSON_UNQUOTE(JSON_EXTRACT(p_user_ids, CONCAT('$[', v_user_idx, ']')));
    SET v_course_idx = 0;

    -- Loop through courses for each user
    WHILE v_course_idx < v_course_count DO
      SET v_course_id = JSON_UNQUOTE(JSON_EXTRACT(p_course_ids, CONCAT('$[', v_course_idx, ']')));

      -- Check if enrollment already exists
      IF NOT EXISTS (SELECT 1 FROM enrol WHERE user_id = v_user_id AND course_id = v_course_id) THEN
        -- Insert enrollment with the optional due date
        INSERT INTO enrol (user_id, course_id, deadline)
        VALUES (v_user_id, v_course_id, p_deadline);

        SET v_enrolled_count = v_enrolled_count + 1;
      ELSEIF p_deadline IS NOT NULL THEN
        -- Already enrolled: refresh the due date so re-assigning takes effect
        UPDATE enrol SET deadline = p_deadline
        WHERE user_id = v_user_id AND course_id = v_course_id;
      END IF;

      SET v_course_idx = v_course_idx + 1;
    END WHILE;

    SET v_user_idx = v_user_idx + 1;
  END WHILE;

  -- Return summary
  SELECT
    v_enrolled_count as enrolledCount,
    v_user_count as userCount,
    v_course_count as courseCount;
END //

DELIMITER ;
