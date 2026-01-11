-- Seed Data for Instructor Reports
-- Instructor: instructor@milekraft.com
-- UUID: b4147cae-e2df-4bdb-9651-4569b100fb51

USE magnetix_db;

SET @instructor_uuid = 'b4147cae-e2df-4bdb-9651-4569b100fb51';

-- ===== UPDATE COURSE LEVELS FOR BETTER DISTRIBUTION =====
UPDATE course
SET level = 'intermediate'
WHERE id = 30 AND creator_id = @instructor_uuid; -- AI course

UPDATE course
SET level = 'advance'
WHERE id = 34 AND creator_id = @instructor_uuid; -- Leadership course

-- ===== ADD MORE ENROLLMENTS WITH PROGRESS =====
-- Get some random student UUIDs (taking first 50 students)
SET @student1 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 0);
SET @student2 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 1);
SET @student3 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 2);
SET @student4 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 3);
SET @student5 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 4);
SET @student6 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 5);
SET @student7 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 6);
SET @student8 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 7);
SET @student9 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 8);
SET @student10 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 9);
SET @student11 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 10);
SET @student12 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 11);
SET @student13 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 12);
SET @student14 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 13);
SET @student15 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 14);
SET @student16 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 15);
SET @student17 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 16);
SET @student18 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 17);
SET @student19 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 18);
SET @student20 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 LIMIT 1 OFFSET 19);

-- ===== CREATE ENROLLMENTS FOR DIFFERENT COURSES =====
-- Digital Marketing course (id=27) - 20 enrollments
INSERT INTO enrol (user_id, course_id, enrolled_date) VALUES
(@student1, 27, DATE_SUB(NOW(), INTERVAL 5 MONTH)),
(@student2, 27, DATE_SUB(NOW(), INTERVAL 5 MONTH)),
(@student3, 27, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student4, 27, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student5, 27, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student6, 27, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student7, 27, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student8, 27, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student9, 27, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student10, 27, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student11, 27, NOW()),
(@student12, 27, NOW()),
(@student13, 27, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student14, 27, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student15, 27, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student16, 27, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student17, 27, DATE_SUB(NOW(), INTERVAL 5 MONTH)),
(@student18, 27, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student19, 27, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student20, 27, DATE_SUB(NOW(), INTERVAL 2 MONTH))
ON DUPLICATE KEY UPDATE enrolled_date=enrolled_date;

-- AI Course (id=30) - 15 enrollments
INSERT INTO enrol (user_id, course_id, enrolled_date) VALUES
(@student1, 30, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student2, 30, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student3, 30, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student5, 30, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student7, 30, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student9, 30, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student11, 30, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student13, 30, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student15, 30, NOW()),
(@student16, 30, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student17, 30, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student18, 30, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student19, 30, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student4, 30, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student6, 30, DATE_SUB(NOW(), INTERVAL 1 MONTH))
ON DUPLICATE KEY UPDATE enrolled_date=enrolled_date;

-- Leadership course (id=34) - 12 enrollments
INSERT INTO enrol (user_id, course_id, enrolled_date) VALUES
(@student2, 34, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student4, 34, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student6, 34, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student8, 34, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student10, 34, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student12, 34, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student14, 34, NOW()),
(@student15, 34, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student17, 34, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student18, 34, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student19, 34, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student20, 34, DATE_SUB(NOW(), INTERVAL 1 MONTH))
ON DUPLICATE KEY UPDATE enrolled_date=enrolled_date;

-- Entrepreneurial course (id=35) - 10 enrollments
INSERT INTO enrol (user_id, course_id, enrolled_date) VALUES
(@student1, 35, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student3, 35, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student5, 35, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student7, 35, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student9, 35, NOW()),
(@student11, 35, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student13, 35, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student16, 35, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student18, 35, DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student20, 35, NOW())
ON DUPLICATE KEY UPDATE enrolled_date=enrolled_date;

-- ===== ADD COURSE PROGRESS DATA =====
-- For Digital Marketing (27) - Mixed completion rates
INSERT INTO course_progress (enroll_id, lesson_completed, completion_percentage, last_accessed)
SELECT
    e.id,
    CASE
        WHEN e.user_id = @student1 THEN 6   -- 100% complete
        WHEN e.user_id = @student2 THEN 6   -- 100% complete
        WHEN e.user_id = @student3 THEN 6   -- 100% complete
        WHEN e.user_id = @student4 THEN 5   -- 83% complete
        WHEN e.user_id = @student5 THEN 5   -- 83% complete
        WHEN e.user_id = @student6 THEN 4   -- 67% complete
        WHEN e.user_id = @student7 THEN 4   -- 67% complete
        WHEN e.user_id = @student8 THEN 3   -- 50% complete
        WHEN e.user_id = @student9 THEN 3   -- 50% complete
        WHEN e.user_id = @student10 THEN 2  -- 33% complete
        WHEN e.user_id = @student11 THEN 1  -- 17% complete
        WHEN e.user_id = @student12 THEN 1  -- 17% complete
        WHEN e.user_id = @student13 THEN 6  -- 100% complete
        WHEN e.user_id = @student14 THEN 5  -- 83% complete
        WHEN e.user_id = @student15 THEN 4  -- 67% complete
        WHEN e.user_id = @student16 THEN 3  -- 50% complete
        WHEN e.user_id = @student17 THEN 6  -- 100% complete
        WHEN e.user_id = @student18 THEN 5  -- 83% complete
        WHEN e.user_id = @student19 THEN 4  -- 67% complete
        WHEN e.user_id = @student20 THEN 2  -- 33% complete
    END as lesson_completed,
    CASE
        WHEN e.user_id IN (@student1, @student2, @student3, @student13, @student17) THEN 100
        WHEN e.user_id IN (@student4, @student5, @student14, @student18) THEN 83
        WHEN e.user_id IN (@student6, @student7, @student15, @student19) THEN 67
        WHEN e.user_id IN (@student8, @student9, @student16) THEN 50
        WHEN e.user_id IN (@student10, @student20) THEN 33
        ELSE 17
    END as completion_percentage,
    NOW() as last_accessed
FROM enrol e
WHERE e.course_id = 27
    AND e.user_id IN (@student1, @student2, @student3, @student4, @student5, @student6, @student7, @student8, @student9, @student10,
                      @student11, @student12, @student13, @student14, @student15, @student16, @student17, @student18, @student19, @student20)
ON DUPLICATE KEY UPDATE
    lesson_completed = VALUES(lesson_completed),
    completion_percentage = VALUES(completion_percentage);

-- For AI Course (30) - Intermediate level
INSERT INTO course_progress (enroll_id, lesson_completed, completion_percentage, last_accessed)
SELECT
    e.id,
    CASE
        WHEN e.user_id IN (@student1, @student2) THEN 7     -- 100% complete
        WHEN e.user_id IN (@student3, @student16) THEN 7    -- 100% complete
        WHEN e.user_id IN (@student5, @student17) THEN 6    -- 86% complete
        WHEN e.user_id IN (@student7, @student18) THEN 5    -- 71% complete
        WHEN e.user_id IN (@student9, @student19) THEN 4    -- 57% complete
        WHEN e.user_id IN (@student11, @student4) THEN 3    -- 43% complete
        ELSE 2                                               -- 29% complete
    END as lesson_completed,
    CASE
        WHEN e.user_id IN (@student1, @student2, @student3, @student16) THEN 100
        WHEN e.user_id IN (@student5, @student17) THEN 86
        WHEN e.user_id IN (@student7, @student18) THEN 71
        WHEN e.user_id IN (@student9, @student19) THEN 57
        WHEN e.user_id IN (@student11, @student4) THEN 43
        ELSE 29
    END as completion_percentage,
    NOW() as last_accessed
FROM enrol e
WHERE e.course_id = 30
    AND e.user_id IN (@student1, @student2, @student3, @student4, @student5, @student6, @student7, @student9, @student11,
                      @student13, @student15, @student16, @student17, @student18, @student19)
ON DUPLICATE KEY UPDATE
    lesson_completed = VALUES(lesson_completed),
    completion_percentage = VALUES(completion_percentage);

-- For Leadership Course (34) - Advanced level
INSERT INTO course_progress (enroll_id, lesson_completed, completion_percentage, last_accessed)
SELECT
    e.id,
    CASE
        WHEN e.user_id IN (@student2, @student4) THEN 7     -- 100% complete
        WHEN e.user_id IN (@student6, @student15) THEN 7    -- 100% complete
        WHEN e.user_id IN (@student8, @student17) THEN 6    -- 86% complete
        WHEN e.user_id IN (@student10, @student18) THEN 5   -- 71% complete
        WHEN e.user_id IN (@student12, @student19) THEN 4   -- 57% complete
        ELSE 3                                               -- 43% complete
    END as lesson_completed,
    CASE
        WHEN e.user_id IN (@student2, @student4, @student6, @student15) THEN 100
        WHEN e.user_id IN (@student8, @student17) THEN 86
        WHEN e.user_id IN (@student10, @student18) THEN 71
        WHEN e.user_id IN (@student12, @student19) THEN 57
        ELSE 43
    END as completion_percentage,
    NOW() as last_accessed
FROM enrol e
WHERE e.course_id = 34
    AND e.user_id IN (@student2, @student4, @student6, @student8, @student10, @student12, @student14, @student15,
                      @student17, @student18, @student19, @student20)
ON DUPLICATE KEY UPDATE
    lesson_completed = VALUES(lesson_completed),
    completion_percentage = VALUES(completion_percentage);

-- For Entrepreneurial Course (35) - Beginner level
INSERT INTO course_progress (enroll_id, lesson_completed, completion_percentage, last_accessed)
SELECT
    e.id,
    CASE
        WHEN e.user_id IN (@student1, @student3) THEN 7     -- 100% complete
        WHEN e.user_id IN (@student5, @student16) THEN 6    -- 86% complete
        WHEN e.user_id IN (@student7, @student18) THEN 5    -- 71% complete
        WHEN e.user_id IN (@student11, @student20) THEN 4   -- 57% complete
        ELSE 3                                               -- 43% complete
    END as lesson_completed,
    CASE
        WHEN e.user_id IN (@student1, @student3) THEN 100
        WHEN e.user_id IN (@student5, @student16) THEN 86
        WHEN e.user_id IN (@student7, @student18) THEN 71
        WHEN e.user_id IN (@student11, @student20) THEN 43
        ELSE 43
    END as completion_percentage,
    NOW() as last_accessed
FROM enrol e
WHERE e.course_id = 35
    AND e.user_id IN (@student1, @student3, @student5, @student7, @student9, @student11, @student13, @student16, @student18, @student20)
ON DUPLICATE KEY UPDATE
    lesson_completed = VALUES(lesson_completed),
    completion_percentage = VALUES(completion_percentage);

-- ===== ADD LEARNING HOURS LOG DATA =====
-- Add learning hours for students across different months
INSERT INTO learning_hours_log (user_id, course_id, hours_spent, log_date, created_at) VALUES
-- Last 6 months for various students
(@student1, 27, 2.5, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_SUB(NOW(), INTERVAL 5 MONTH)),
(@student1, 30, 3.0, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student1, 35, 1.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student2, 27, 3.0, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_SUB(NOW(), INTERVAL 5 MONTH)),
(@student2, 30, 2.5, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student2, 34, 4.0, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student3, 27, 2.0, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student3, 30, 3.5, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student3, 35, 2.0, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student4, 27, 1.5, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student4, 30, 2.0, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student4, 34, 3.5, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student5, 27, 2.5, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student5, 30, 3.0, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student5, 35, 2.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student6, 27, 1.5, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student6, 30, 1.0, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student6, 34, 4.0, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student7, 27, 2.0, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student7, 30, 2.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student7, 35, 1.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student8, 27, 1.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student8, 34, 3.0, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student9, 27, 1.0, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student9, 30, 1.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student9, 35, 0.5, NOW(), NOW()),
(@student10, 27, 1.0, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student10, 34, 2.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student11, 27, 0.5, NOW(), NOW()),
(@student11, 30, 1.0, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student11, 35, 1.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student12, 27, 0.5, NOW(), NOW()),
(@student12, 34, 1.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student13, 27, 2.5, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student13, 30, 1.0, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student13, 35, 1.0, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student14, 27, 2.0, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student14, 34, 0.5, NOW(), NOW()),
(@student15, 27, 1.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student15, 30, 0.5, NOW(), NOW()),
(@student15, 34, 3.5, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student16, 27, 1.0, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student16, 30, 3.0, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student16, 35, 2.0, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student17, 27, 2.5, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_SUB(NOW(), INTERVAL 5 MONTH)),
(@student17, 30, 3.0, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student17, 34, 3.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student18, 27, 2.0, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_SUB(NOW(), INTERVAL 4 MONTH)),
(@student18, 30, 2.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student18, 34, 2.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student18, 35, 1.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student19, 27, 1.5, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_SUB(NOW(), INTERVAL 3 MONTH)),
(@student19, 30, 1.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student19, 34, 1.5, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student20, 27, 1.0, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_SUB(NOW(), INTERVAL 2 MONTH)),
(@student20, 34, 1.5, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_SUB(NOW(), INTERVAL 1 MONTH)),
(@student20, 35, 0.5, NOW(), NOW())
ON DUPLICATE KEY UPDATE hours_spent=hours_spent;

SELECT 'Instructor reports seed data created successfully!' as message;

-- Verify the data
SELECT
    'Enrollments created' as metric,
    COUNT(*) as count
FROM enrol e
INNER JOIN course c ON e.course_id = c.id
WHERE c.creator_id = @instructor_uuid
UNION ALL
SELECT
    'Course progress entries' as metric,
    COUNT(*) as count
FROM course_progress cp
INNER JOIN enrol e ON cp.enroll_id = e.id
INNER JOIN course c ON e.course_id = c.id
WHERE c.creator_id = @instructor_uuid
UNION ALL
SELECT
    'Learning hours logs' as metric,
    COUNT(*) as count
FROM learning_hours_log lhl
INNER JOIN course c ON lhl.course_id = c.id
WHERE c.creator_id = @instructor_uuid
UNION ALL
SELECT
    'Completed courses' as metric,
    COUNT(*) as count
FROM course_progress cp
INNER JOIN enrol e ON cp.enroll_id = e.id
INNER JOIN course c ON e.course_id = c.id
WHERE c.creator_id = @instructor_uuid
    AND cp.completion_percentage = 100;
