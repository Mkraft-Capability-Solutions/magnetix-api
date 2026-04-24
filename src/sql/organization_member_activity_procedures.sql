-- =====================================================
-- Organization Member Activity — stored procedures
-- Used by admin to view + manage a specific org member's
-- learning activity.
--
-- Applied by: migrations-sequelize/<ts>-organization-member-activity.js
-- =====================================================

-- -----------------------------------------------------
-- 1. Enrolled courses with per-course progress
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS get_member_enrolled_courses;
DELIMITER //
CREATE PROCEDURE get_member_enrolled_courses(IN p_user_id VARCHAR(36))
BEGIN
  SELECT
    c.id AS course_id,
    c.title AS title,
    e.status AS status,
    COALESCE(e.progress, 0) AS progress,
    e.enrolled_date AS enrolled_date,
    e.completed_at AS completed_at,
    (
      SELECT MAX(cp.completed_at)
      FROM course_progress cp
      WHERE cp.enroll_id = e.id
    ) AS last_activity,
    (
      SELECT COUNT(*) FROM course_progress cp
      WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1
    ) AS lessons_completed
  FROM enrol e
  INNER JOIN course c ON c.id = e.course_id
  WHERE e.user_id = p_user_id
  ORDER BY e.enrolled_date DESC;
END //
DELIMITER ;

-- -----------------------------------------------------
-- 2. Assessment history (submissions + pending assignments)
-- Two rowsets UNIONed:
--   a) submissions:  feedback_responses joined to feedback_forms by form_id
--                    matched on respondent_email = p_email
--   b) pending:      learning_item_instances (item_type='quiz') joined to
--                    learning_item_progress by instance_id for this user
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS get_member_assessment_history;
DELIMITER //
CREATE PROCEDURE get_member_assessment_history(
  IN p_user_id VARCHAR(36),
  IN p_email VARCHAR(255)
)
BEGIN
  SELECT
    'submission' AS kind,
    ff.id AS form_id,
    NULL AS instance_id,
    ff.name AS title,
    'completed' AS status,
    NULL AS assigned_at,
    NULL AS due_date,
    fr.submitted_at AS submitted_at,
    fr.score AS score,
    fr.max_score AS max_score,
    fr.percentage AS percentage
  FROM feedback_responses fr
  INNER JOIN feedback_forms ff ON ff.id = fr.form_id
  WHERE fr.respondent_email = p_email
    AND ff.type = 'assessment'

  UNION ALL

  SELECT
    'pending' AS kind,
    lii.source_id AS form_id,
    lii.id AS instance_id,
    lii.source_title AS title,
    lip.status AS status,
    lii.created_at AS assigned_at,
    lii.deadline AS due_date,
    lip.completed_at AS submitted_at,
    lip.score AS score,
    NULL AS max_score,
    NULL AS percentage
  FROM learning_item_instances lii
  INNER JOIN learning_item_progress lip ON lip.instance_id = lii.id
  WHERE lii.item_type = 'quiz'
    AND lip.user_id = p_user_id
    AND lip.status IN ('not_started', 'in_progress')

  ORDER BY submitted_at DESC, assigned_at DESC;
END //
DELIMITER ;

-- -----------------------------------------------------
-- 3. Certificates (self-uploaded + admin-issued)
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS get_member_certificates;
DELIMITER //
CREATE PROCEDURE get_member_certificates(IN p_user_id VARCHAR(36))
BEGIN
  SELECT
    'self' AS source,
    sc.id AS id,
    sc.certificate_name AS certificate_name,
    sc.status AS status,
    sc.issue_date AS issued_date,
    sc.expiry_date AS expiry_date,
    sc.certificate_link AS link
  FROM student_certificates sc
  WHERE sc.user_id = p_user_id

  UNION ALL

  SELECT
    'admin' AS source,
    aic.id AS id,
    aic.certificate_name AS certificate_name,
    aic.status AS status,
    aic.issued_date AS issued_date,
    aic.expiry_date AS expiry_date,
    NULL AS link
  FROM admin_issued_certificates aic
  WHERE aic.user_id = p_user_id

  ORDER BY issued_date DESC;
END //
DELIMITER ;

-- -----------------------------------------------------
-- 4. Learning hours over the last p_days (incl. today)
--    Returns one row per day (0 hours if no log).
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS get_member_learning_hours;
DELIMITER //
CREATE PROCEDURE get_member_learning_hours(
  IN p_user_id VARCHAR(36),
  IN p_days INT
)
BEGIN
  WITH RECURSIVE date_range AS (
    SELECT CURDATE() AS day
    UNION ALL
    SELECT DATE_SUB(day, INTERVAL 1 DAY)
    FROM date_range
    WHERE day > DATE_SUB(CURDATE(), INTERVAL (p_days - 1) DAY)
  )
  SELECT
    dr.day,
    COALESCE(SUM(lhl.hours_spent), 0) AS hours
  FROM date_range dr
  LEFT JOIN learner_hours_log lhl
    ON lhl.log_date = dr.day
    AND lhl.user_id = p_user_id
  GROUP BY dr.day
  ORDER BY dr.day ASC;
END //
DELIMITER ;

-- -----------------------------------------------------
-- 5. Assign an assessment to a user.
--    Creates a learning_item_instances row (item_type='quiz')
--    plus a learning_item_progress row (status='not_started').
--    Returns the new instance id.
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS assign_assessment_to_user;
DELIMITER //
CREATE PROCEDURE assign_assessment_to_user(
  IN p_form_id INT,
  IN p_user_id VARCHAR(36),
  IN p_assigned_by VARCHAR(36),
  IN p_due_date DATE
)
BEGIN
  DECLARE v_title VARCHAR(255);
  DECLARE v_description TEXT;
  DECLARE v_instance_id INT;

  SELECT ff.name, ff.description
    INTO v_title, v_description
  FROM feedback_forms ff
  WHERE ff.id = p_form_id
  LIMIT 1;

  IF v_title IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Assessment form not found';
  END IF;

  INSERT INTO learning_item_instances (
    title, description, item_type, source_id, source_title,
    assigned_to_all, deadline, status, created_by
  ) VALUES (
    v_title, v_description, 'quiz', p_form_id, v_title,
    0, p_due_date, 'active', p_assigned_by
  );

  SET v_instance_id = LAST_INSERT_ID();

  INSERT INTO learning_item_progress (
    instance_id, user_id, status
  ) VALUES (
    v_instance_id, p_user_id, 'not_started'
  );

  SELECT v_instance_id AS instance_id, v_title AS title, p_due_date AS due_date;
END //
DELIMITER ;
