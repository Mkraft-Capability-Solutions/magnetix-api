-- ========================================
-- STORED PROCEDURE: Get Mentorship Status
-- ========================================
-- Returns the mentorship status between a student and mentor
-- Returns: NULL (no request), 0 (pending), 1 (accepted)
-- ========================================

USE lms_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS `get_mentorship_status`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_mentorship_status` (
  IN `p_student_uuid` VARCHAR(36),
  IN `p_mentor_uuid` VARCHAR(36)
)
BEGIN
  SELECT
    m.id AS mentorship_id,
    m.status AS mentorship_status,
    m.mentorship_deleted,
    m.datetime AS created_at,
    CASE
      WHEN m.status = 1 AND m.mentorship_deleted = 0 THEN 'accepted'
      WHEN m.status = 0 AND m.mentorship_deleted = 0 THEN 'pending'
      WHEN m.mentorship_deleted = 1 THEN 'deleted'
      ELSE 'unknown'
    END AS status_text
  FROM mentorship m
  WHERE m.menteeId = p_student_uuid
    AND m.mentorId = p_mentor_uuid
  ORDER BY m.datetime DESC
  LIMIT 1;
END$$

DELIMITER ;

SELECT 'get_mentorship_status stored procedure created successfully!' AS status;
