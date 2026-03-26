-- Migration: Add assessment columns to course_lesson table and update stored procedure
-- Fixes: "Unknown column 'assessment_id' in INSERT INTO" error

-- Step 1: Add missing columns to course_lesson table
ALTER TABLE course_lesson ADD COLUMN IF NOT EXISTS assessment_id INT NULL DEFAULT NULL;
ALTER TABLE course_lesson ADD COLUMN IF NOT EXISTS require_section_completion TINYINT(1) DEFAULT 0;
ALTER TABLE course_lesson ADD COLUMN IF NOT EXISTS assessment_start_date DATE NULL DEFAULT NULL;
ALTER TABLE course_lesson ADD COLUMN IF NOT EXISTS assessment_end_date DATE NULL DEFAULT NULL;

-- Step 2: Recreate the stored procedure with assessment parameters
DELIMITER //

DROP PROCEDURE IF EXISTS add_course_lesson //

CREATE PROCEDURE add_course_lesson(
  IN p_title VARCHAR(500),
  IN p_section_id INT,
  IN p_lesson_type VARCHAR(50),
  IN p_lesson_content_type VARCHAR(50),
  IN p_lesson_content_document VARCHAR(500),
  IN p_lesson_content_scorm VARCHAR(500),
  IN p_lesson_content_mp4 VARCHAR(500),
  IN p_lesson_content_url VARCHAR(1000),
  IN p_lesson_duration VARCHAR(100),
  IN p_course_id INT,
  IN p_creator_id VARCHAR(36),
  IN p_last_updated_by VARCHAR(36),
  IN p_lesson_order INT,
  IN p_assessment_id INT,
  IN p_require_section_completion TINYINT(1),
  IN p_assessment_start_date DATE,
  IN p_assessment_end_date DATE
)
BEGIN
  DECLARE v_lesson_id INT;
  DECLARE v_max_order INT;

  -- Auto-calculate lesson order if not provided
  IF p_lesson_order IS NULL THEN
    SELECT COALESCE(MAX(lesson_order), 0) + 1 INTO v_max_order
    FROM course_lesson
    WHERE section_id = p_section_id AND is_deleted = 0;
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
END //

DELIMITER ;
