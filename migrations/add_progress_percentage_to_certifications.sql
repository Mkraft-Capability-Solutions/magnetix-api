-- Add progress_percentage column to student_certification_enrollments table
-- This will track the completion percentage based on lesson completion

ALTER TABLE student_certification_enrollments
ADD COLUMN progress_percentage INT DEFAULT 0
COMMENT 'Percentage of completion based on lessons completed (0-100)'
AFTER status;

-- Update existing records to calculate their current progress
-- This is a one-time update for existing enrollments
UPDATE student_certification_enrollments sce
SET sce.progress_percentage = (
  SELECT
    CASE
      WHEN total_lessons > 0
      THEN ROUND((completed_lessons / total_lessons) * 100)
      ELSE 0
    END
  FROM (
    SELECT
      -- Total lessons across all required courses
      (SELECT COUNT(DISTINCT cl.id)
       FROM certification_course_requirements ccr
       INNER JOIN course_lesson cl ON ccr.course_id = cl.course_id
       WHERE ccr.certification_id = sce.certification_id) AS total_lessons,

      -- Completed lessons
      (SELECT COUNT(DISTINCT cp.lesson_id)
       FROM certification_course_requirements ccr
       INNER JOIN enrol e ON ccr.course_id = e.course_id
         AND e.user_id COLLATE utf8mb4_general_ci = sce.user_id COLLATE utf8mb4_general_ci
       INNER JOIN course_progress cp ON e.id = cp.enroll_id
       INNER JOIN course_lesson cl ON cp.lesson_id = cl.id
       WHERE ccr.certification_id = sce.certification_id
       AND cp.lesson_completed = 1) AS completed_lessons
  ) AS progress_calc
)
WHERE sce.status = 'in_progress';

-- Auto-complete certifications that have reached 100%
UPDATE student_certification_enrollments sce
SET
  sce.status = 'completed',
  sce.completion_date = NOW(),
  sce.certificate_issued_date = NOW(),
  sce.updated_at = NOW()
WHERE sce.progress_percentage = 100
  AND sce.status = 'in_progress'
  AND sce.completion_date IS NULL;

SELECT 'Migration completed: progress_percentage column added and existing records updated' as message;
