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
];

module.exports = {
  PROCEDURES,
  GET_USER_DETAILS_CREATE,
  GET_USER_DETAILS_CREATE_LEGACY,
  ADD_COURSE_LESSON_CREATE,
  COURSE_COMPLETION_REPORT_CREATE,
};
