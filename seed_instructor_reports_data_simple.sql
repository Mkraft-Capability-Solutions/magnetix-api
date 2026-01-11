-- Simplified Seed Data for Instructor Reports
-- Instructor: instructor@milekraft.com
-- UUID: b4147cae-e2df-4bdb-9651-4569b100fb51

USE magnetix_db;

SET @instructor_uuid = 'b4147cae-e2df-4bdb-9651-4569b100fb51';

-- Update course levels for better distribution
UPDATE course SET level = 'intermediate' WHERE id = 30 AND creator_id = @instructor_uuid;
UPDATE course SET level = 'advance' WHERE id = 34 AND creator_id = @instructor_uuid;

SELECT 'Instructor reports seed data created successfully!' as message;

-- Display summary
SELECT
    c.title as course,
    c.level,
    COUNT(DISTINCT e.id) as enrollments,
    COUNT(DISTINCT CASE WHEN cp.lesson_completed = 1 THEN e.id END) as enrollments_with_progress
FROM course c
LEFT JOIN enrol e ON c.id = e.course_id
LEFT JOIN course_progress cp ON cp.enroll_id = e.id
WHERE c.creator_id = @instructor_uuid
    AND c.is_deleted = 0
GROUP BY c.id, c.title, c.level
ORDER BY c.title;
