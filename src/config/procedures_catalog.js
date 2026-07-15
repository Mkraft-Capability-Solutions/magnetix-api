'use strict';

/**
 * Canonical definitions of the stored procedures the app depends on that have
 * a history of schema drift (a loose `.sql` was the "source", and it was never
 * applied to some databases). This module is the SINGLE SOURCE OF TRUTH for
 * those procedure bodies.
 *
 * It is imported by:
 *   1. The umzug migration that first introduced / fixed each procedure, and
 *   2. `ensureProcedures()` in `ensure_schema.js`, which runs on EVERY boot,
 *      independent of SequelizeMeta, and reconciles a procedure whenever it is
 *      missing or stale.
 *
 * Because both use the same string, the migration and the boot-time self-heal
 * can never disagree — the class of "stale procedure on prod" bug is closed.
 *
 * IMPORTANT (why no DELIMITER):
 *   These `create` strings are sent to MySQL as a SINGLE statement (via
 *   sequelize.query / promisePool.query). The driver does not split on `;`, so
 *   the semicolons inside the body are fine and a `DELIMITER` directive (a
 *   client-only construct) must NOT be present — it would be a syntax error.
 *
 * `marker`:
 *   A substring that MUST appear in a CORRECT procedure body. `ensureProcedures`
 *   reads information_schema.routines.ROUTINE_DEFINITION (which contains the
 *   BEGIN…END body) and, if the marker is absent, treats the procedure as stale
 *   and recreates it. Pick a marker that exists ONLY in the fixed version.
 */

// --- get_user_details -------------------------------------------------------
// role 1 -> students, 2 -> instructors, 3 -> LEFT JOIN admins,
// 4 -> LEFT JOIN super_admins. The bug was role 4 joining `admins` (wrong
// table) -> "null null" name / "User not found". Marker: `super_admins`, which
// only the fixed body contains.
const GET_USER_DETAILS_CREATE = `
CREATE PROCEDURE get_user_details(IN p_uuid VARCHAR(36))
BEGIN
    DECLARE v_role_id INT;
    SELECT role_id INTO v_role_id FROM users WHERE uuid = p_uuid AND is_deleted = 0;
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
    END IF;
    IF v_role_id = 1 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, s.address, s.dob, s.gender, s.contact,
               s.last_name, s.first_name, s.dp, s.specialization, s.country, s.state, s.city,
               s.profile_visibility, s.resume_url, s.about, s.social_links
        FROM users u JOIN students s ON u.uuid = s.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 2 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, i.address, i.dob, i.gender, i.contact,
               i.last_name, i.first_name, i.dp, i.expertise, i.country, i.state, i.city,
               i.profile_visibility, i.resume_url, i.about, i.social_links
        FROM users u JOIN instructors i ON u.uuid = i.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 3 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, a.address, a.dob, a.gender, a.contact,
               a.last_name, a.first_name, a.dp, a.country, a.state, a.city,
               a.profile_visibility, a.resume_url, a.about, a.social_links,
               NULL as expertise, NULL as specialization
        FROM users u LEFT JOIN admins a ON u.uuid = a.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 4 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, sa.address, sa.dob, sa.gender, sa.contact,
               sa.last_name, sa.first_name, sa.dp, sa.country, sa.state, sa.city,
               sa.profile_visibility, sa.resume_url, sa.about, sa.social_links,
               NULL as expertise, NULL as specialization
        FROM users u LEFT JOIN super_admins sa ON u.uuid = sa.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    END IF;
END`;

// Pre-fix definition (role 3 OR 4 -> INNER JOIN admins). Only used by the
// migration's down() for a clean rollback. Not part of the boot self-heal.
const GET_USER_DETAILS_CREATE_LEGACY = `
CREATE PROCEDURE get_user_details(IN p_uuid VARCHAR(36))
BEGIN
    DECLARE v_role_id INT;
    SELECT role_id INTO v_role_id FROM users WHERE uuid = p_uuid AND is_deleted = 0;
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
    END IF;
    IF v_role_id = 1 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, s.address, s.dob, s.gender, s.contact,
               s.last_name, s.first_name, s.dp, s.specialization, s.country, s.state, s.city,
               s.profile_visibility, s.resume_url, s.about, s.social_links
        FROM users u JOIN students s ON u.uuid = s.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 2 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, i.address, i.dob, i.gender, i.contact,
               i.last_name, i.first_name, i.dp, i.expertise, i.country, i.state, i.city,
               i.profile_visibility, i.resume_url, i.about, i.social_links
        FROM users u JOIN instructors i ON u.uuid = i.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 3 OR v_role_id = 4 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, a.address, a.dob, a.gender, a.contact,
               a.last_name, a.first_name, a.dp, a.country, a.state, a.city,
               a.profile_visibility, a.resume_url, a.about, a.social_links,
               NULL as expertise, NULL as specialization
        FROM users u JOIN admins a ON u.uuid = a.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    END IF;
END`;

// --- add_course_lesson (17 params) ------------------------------------------
// The bug was an older 13-arg version on some DBs -> ER_SP_WRONG_NO_OF_ARGS
// (backend calls with 17 args). Marker: `assessment_end_date`, present only in
// the 17-param body. Requires the assessment columns on `course_lesson`
// (self-healed via EXPECTED_COLUMNS in ensure_schema.js).
const ADD_COURSE_LESSON_CREATE = `
CREATE PROCEDURE add_course_lesson(
  IN p_title VARCHAR(500), IN p_section_id INT, IN p_lesson_type VARCHAR(50), IN p_lesson_content_type VARCHAR(50),
  IN p_lesson_content_document VARCHAR(500), IN p_lesson_content_scorm VARCHAR(500), IN p_lesson_content_mp4 VARCHAR(500), IN p_lesson_content_url VARCHAR(1000),
  IN p_lesson_duration VARCHAR(100), IN p_course_id INT, IN p_creator_id VARCHAR(36), IN p_last_updated_by VARCHAR(36),
  IN p_lesson_order INT, IN p_assessment_id INT, IN p_require_section_completion TINYINT(1), IN p_assessment_start_date DATE, IN p_assessment_end_date DATE
)
BEGIN
  DECLARE v_lesson_id INT;
  DECLARE v_max_order INT;
  IF p_lesson_order IS NULL THEN
    SELECT COALESCE(MAX(lesson_order), 0) + 1 INTO v_max_order FROM course_lesson WHERE section_id = p_section_id AND is_deleted = 0;
  ELSE
    SET v_max_order = p_lesson_order;
  END IF;
  INSERT INTO course_lesson (
    title, section_id, lesson_type, lesson_content_type,
    lesson_content_document, lesson_content_scorm, lesson_content_mp4, lesson_content_url,
    lesson_duration, course_id, creator_id, last_updated_by, lesson_order,
    assessment_id, require_section_completion, assessment_start_date, assessment_end_date
  ) VALUES (
    p_title, p_section_id, p_lesson_type, p_lesson_content_type,
    p_lesson_content_document, p_lesson_content_scorm, p_lesson_content_mp4, p_lesson_content_url,
    p_lesson_duration, p_course_id, p_creator_id, p_last_updated_by, v_max_order,
    p_assessment_id, COALESCE(p_require_section_completion, 0), p_assessment_start_date, p_assessment_end_date
  );
  SET v_lesson_id = LAST_INSERT_ID();
  SELECT v_lesson_id as id, v_lesson_id as lessonId, 'Lesson created successfully' as message;
END`;

// --- sp_get_course_completion_report ----------------------------------------
// The legacy version computed completedCount as
//   COUNT(DISTINCT CASE WHEN e.last_updated IS NOT NULL THEN e.user_id END)
// i.e. it counted EVERY enrolment as "completed" (last_updated is virtually
// never null) — reporting ~100% completion for every course, in the SuperAdmin
// AND instructor course-completion reports. This version uses the real
// definition: an enrolment is complete when the course has lessons and the
// enrolment's completed-lesson count reaches the course's lesson count
// (identical to the KPI band / enrolment funnel). Marker: `lesson_completed`,
// present only in the corrected body.
const COURSE_COMPLETION_REPORT_CREATE = `
CREATE PROCEDURE sp_get_course_completion_report(
  IN p_instructor_id VARCHAR(36),
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  SELECT
    c.id AS courseId,
    c.title AS courseTitle,
    COALESCE(cat.category_name, 'Uncategorized') AS category,
    COUNT(DISTINCT e.id) AS totalEnrollments,
    COUNT(DISTINCT CASE WHEN tl.lc > 0 AND cd.cc >= tl.lc THEN e.id END) AS completedCount,
    ROUND(
      COUNT(DISTINCT CASE WHEN tl.lc > 0 AND cd.cc >= tl.lc THEN e.id END) * 100.0
      / NULLIF(COUNT(DISTINCT e.id), 0), 1
    ) AS completionRate,
    ROUND(COALESCE(SUM(cd.total_time), 0) / NULLIF(COUNT(DISTINCT e.id), 0), 0) AS avgTimeSpentMinutes,
    c.course_duration AS courseDuration
  FROM course c
  LEFT JOIN enrol e ON c.id = e.course_id
    AND (p_from_date IS NULL OR e.enrolled_date >= p_from_date)
    AND (p_to_date IS NULL OR e.enrolled_date <= p_to_date)
  LEFT JOIN category cat ON c.category_id = cat.id
  LEFT JOIN (
    SELECT cl.course_id, COUNT(*) AS lc
    FROM course_lesson cl WHERE cl.is_deleted = 0 GROUP BY cl.course_id
  ) tl ON tl.course_id = c.id
  LEFT JOIN (
    SELECT cp.enroll_id,
           COUNT(CASE WHEN cp.lesson_completed = 1 THEN 1 END) AS cc,
           SUM(cp.time_spent) AS total_time
    FROM course_progress cp GROUP BY cp.enroll_id
  ) cd ON cd.enroll_id = e.id
  WHERE c.is_deleted = 0
    AND (p_instructor_id IS NULL OR c.creator_id = p_instructor_id)
  GROUP BY c.id, c.title, cat.category_name, c.course_duration
  ORDER BY completionRate DESC, totalEnrollments DESC;
END`;

// --- get_member_enrolled_courses --------------------------------------------
// Powers the admin/manager "member learning history" (enrolled courses) view.
// The legacy body read `enrol.progress` and `course_progress.completed_at` —
// neither column exists on the live DB — so every CALL threw
// "Unknown column 'e.progress'". This version derives progress from completed
// course_progress rows vs the course's course_lesson count, and uses
// course_progress.last_access for activity/completion timestamps. Marker:
// `course_lesson`, which only the fixed body references.
const GET_MEMBER_ENROLLED_COURSES_CREATE = `
CREATE PROCEDURE get_member_enrolled_courses(IN p_user_id VARCHAR(36))
BEGIN
  SELECT
    course_id,
    title,
    CASE
      WHEN progress >= 100 THEN 'completed'
      WHEN progress > 0 OR lessons_started > 0 THEN 'in_progress'
      ELSE 'enrolled'
    END AS status,
    progress,
    enrolled_date,
    CASE WHEN progress >= 100 THEN completed_at ELSE NULL END AS completed_at,
    last_activity,
    lessons_completed
  FROM (
    SELECT
      c.id AS course_id,
      c.title AS title,
      e.enrolled_date AS enrolled_date,
      (SELECT COUNT(*) FROM course_progress cp WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1) AS lessons_completed,
      (SELECT COUNT(*) FROM course_progress cp WHERE cp.enroll_id = e.id) AS lessons_started,
      COALESCE(ROUND(100.0 * (SELECT COUNT(*) FROM course_progress cp WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1) / NULLIF((SELECT COUNT(*) FROM course_lesson cl WHERE cl.course_id = e.course_id), 0), 0), 0) AS progress,
      (SELECT MAX(cp.last_access) FROM course_progress cp WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1) AS completed_at,
      (SELECT MAX(cp.last_access) FROM course_progress cp WHERE cp.enroll_id = e.id) AS last_activity
    FROM enrol e
    INNER JOIN course c ON c.id = e.course_id
    WHERE e.user_id = p_user_id
  ) t
  ORDER BY enrolled_date DESC;
END`;

// --- get_student_dashboard_stats --------------------------------------------
// Powers the student dashboard AND the admin/manager member "overview" card.
// The legacy streak CTE read `course_progress.completed_at`, which does not
// exist on the live DB -> "Unknown column 'cp.completed_at'". This version uses
// `course_progress.last_access` (updated whenever a lesson row changes) for the
// per-day activity. Marker: `last_access`, absent from the broken body.
const GET_STUDENT_DASHBOARD_STATS_CREATE = `
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

  SELECT COUNT(*)
  INTO v_total_courses
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  WHERE e.user_id = p_user_id
    AND c.is_deleted = 0
    AND c.status = 'active';

  SELECT COUNT(*)
  INTO v_completed_courses
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  WHERE e.user_id = p_user_id
    AND c.is_deleted = 0
    AND c.status = 'active'
    AND (
      SELECT COUNT(*) FROM course_progress cp
      WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1
    ) = (
      SELECT COUNT(*) FROM course_lesson cl WHERE cl.course_id = c.id
    )
    AND (
      SELECT COUNT(*) FROM course_lesson cl WHERE cl.course_id = c.id
    ) > 0;

  SET v_courses_to_milestone = 5 - (v_completed_courses % 5);
  IF v_courses_to_milestone = 5 AND v_completed_courses > 0 THEN
    SET v_courses_to_milestone = 0;
  END IF;

  SELECT COUNT(*)
  INTO v_course_certificates
  FROM student_certificates
  WHERE user_id = p_user_id
    AND status = 'approved';

  SELECT COUNT(*)
  INTO v_admin_certificates
  FROM admin_issued_certificates
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (expiry_date IS NULL OR expiry_date >= CURDATE());

  SET v_total_certificates = v_course_certificates + v_admin_certificates;

  WITH RECURSIVE dates AS (
    SELECT CURDATE() as check_date
    UNION ALL
    SELECT DATE_SUB(check_date, INTERVAL 1 DAY)
    FROM dates
    WHERE check_date > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  ),
  daily_activity AS (
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

  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '42S02' SET v_current_monthly_hours = 0;

    SELECT COALESCE(SUM(hours_spent), 0)
    INTO v_current_monthly_hours
    FROM learner_hours_log
    WHERE user_id = p_user_id
      AND YEAR(log_date) = YEAR(CURDATE())
      AND MONTH(log_date) = MONTH(CURDATE());
  END;

  SET v_monthly_goal_percentage = LEAST(100, (v_current_monthly_hours / v_monthly_goal_hours) * 100);

  SELECT
    v_total_courses as total_courses,
    v_completed_courses as completed_courses,
    v_courses_to_milestone as courses_to_milestone,
    v_total_certificates as total_certificates,
    v_learning_streak as learning_streak,
    ROUND(v_current_monthly_hours, 1) as current_monthly_hours,
    ROUND(v_monthly_goal_hours, 1) as monthly_goal_hours,
    ROUND(v_monthly_goal_percentage, 0) as monthly_goal_percentage;
END`;

// --- sp_bulk_enroll_users ----------------------------------------------------
// Powers "Assign Training" on the My Team screen (bulk-enrol a list of users
// into a list of courses with an optional due date). The legacy body accepted
// `p_deadline` but never stored it — the due date was silently dropped, and
// `enrol` had no column to hold it. This version writes the deadline into the
// new `enrol.deadline` column (self-healed via EXPECTED_COLUMNS), and refreshes
// it when a user is already enrolled so re-assigning with a date takes effect.
// Marker: `deadline`, absent from the legacy body.
const SP_BULK_ENROLL_USERS_CREATE = `
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

  SET v_user_count = JSON_LENGTH(p_user_ids);
  SET v_course_count = JSON_LENGTH(p_course_ids);

  WHILE v_user_idx < v_user_count DO
    SET v_user_id = JSON_UNQUOTE(JSON_EXTRACT(p_user_ids, CONCAT('$[', v_user_idx, ']')));
    SET v_course_idx = 0;

    WHILE v_course_idx < v_course_count DO
      SET v_course_id = JSON_UNQUOTE(JSON_EXTRACT(p_course_ids, CONCAT('$[', v_course_idx, ']')));

      IF NOT EXISTS (SELECT 1 FROM enrol WHERE user_id = v_user_id AND course_id = v_course_id) THEN
        INSERT INTO enrol (user_id, course_id, deadline)
        VALUES (v_user_id, v_course_id, p_deadline);
        SET v_enrolled_count = v_enrolled_count + 1;
      ELSEIF p_deadline IS NOT NULL THEN
        UPDATE enrol SET deadline = p_deadline
        WHERE user_id = v_user_id AND course_id = v_course_id;
      END IF;

      SET v_course_idx = v_course_idx + 1;
    END WHILE;

    SET v_user_idx = v_user_idx + 1;
  END WHILE;

  SELECT
    v_enrolled_count as enrolledCount,
    v_user_count as userCount,
    v_course_count as courseCount;
END`;

// --- sp_get_team_learning_history --------------------------------------------
// Powers the "Learning History" tab on My Team. Extended to surface the
// per-enrolment due date (enrol.deadline, written by sp_bulk_enroll_users) plus
// an `overdue` flag (deadline passed and course not yet complete). Marker:
// `dueDate`, absent from the legacy body. Depends on enrol.deadline, which is
// self-healed by EXPECTED_COLUMNS during ensureSchema() — which runs before
// ensureProcedures(), so the column always exists by the time this is created.
const SP_GET_TEAM_LEARNING_HISTORY_CREATE = `
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
END`;

/**
 * Procedures reconciled on every boot by ensureProcedures().
 * Order does not matter (procedures are independent).
 */
const PROCEDURES = [
  {
    name: 'get_user_details',
    marker: 'super_admins',
    create: GET_USER_DETAILS_CREATE,
  },
  {
    name: 'add_course_lesson',
    marker: 'assessment_end_date',
    create: ADD_COURSE_LESSON_CREATE,
  },
  {
    name: 'sp_get_course_completion_report',
    marker: 'lesson_completed',
    create: COURSE_COMPLETION_REPORT_CREATE,
  },
  {
    name: 'get_member_enrolled_courses',
    marker: 'course_lesson',
    create: GET_MEMBER_ENROLLED_COURSES_CREATE,
  },
  {
    name: 'get_student_dashboard_stats',
    marker: 'last_access',
    create: GET_STUDENT_DASHBOARD_STATS_CREATE,
  },
  {
    name: 'sp_bulk_enroll_users',
    marker: 'deadline',
    create: SP_BULK_ENROLL_USERS_CREATE,
  },
  {
    name: 'sp_get_team_learning_history',
    marker: 'dueDate',
    create: SP_GET_TEAM_LEARNING_HISTORY_CREATE,
  },
];

module.exports = {
  PROCEDURES,
  GET_USER_DETAILS_CREATE,
  GET_USER_DETAILS_CREATE_LEGACY,
  ADD_COURSE_LESSON_CREATE,
  COURSE_COMPLETION_REPORT_CREATE,
  GET_MEMBER_ENROLLED_COURSES_CREATE,
  GET_STUDENT_DASHBOARD_STATS_CREATE,
  SP_BULK_ENROLL_USERS_CREATE,
  SP_GET_TEAM_LEARNING_HISTORY_CREATE,
};
