-- ============================================
-- INSTRUCTOR DASHBOARD TEST DATA SEEDER
-- Creates sample data for testing instructor dashboard
-- ============================================

-- Step 1: Ensure you have an instructor user
-- ============================================
-- Check if instructor exists, if not, update an existing user or create one
-- OPTION A: Update existing user to be instructor (REPLACE email with yours)
UPDATE users
SET role_id = 2
WHERE email = 'your-email@example.com' AND is_deleted = 0;

-- OPTION B: Create new instructor (uncomment if needed)
/*
INSERT INTO users (uuid, email, password, role_id, first_name, last_name, is_deleted, created_at)
VALUES (
    UUID(),
    'instructor@test.com',
    '$2a$10$XYZ...', -- Use a hashed password
    2, -- Instructor role
    'Test',
    'Instructor',
    0,
    NOW()
);
*/

-- Get the instructor UUID (save this for next steps)
SET @instructor_uuid = (SELECT uuid FROM users WHERE role_id = 2 AND is_deleted = 0 LIMIT 1);

SELECT @instructor_uuid as 'Instructor UUID - Save This!';

-- Step 2: Create sample students
-- ============================================
INSERT IGNORE INTO users (uuid, email, password, role_id, first_name, last_name, is_deleted, created_at)
VALUES
    (UUID(), 'student1@test.com', '$2a$10$dummy.hash', 1, 'Alice', 'Student', 0, NOW()),
    (UUID(), 'student2@test.com', '$2a$10$dummy.hash', 1, 'Bob', 'Student', 0, NOW()),
    (UUID(), 'student3@test.com', '$2a$10$dummy.hash', 1, 'Charlie', 'Student', 0, NOW()),
    (UUID(), 'student4@test.com', '$2a$10$dummy.hash', 1, 'Diana', 'Student', 0, NOW()),
    (UUID(), 'student5@test.com', '$2a$10$dummy.hash', 1, 'Eve', 'Student', 0, NOW());

-- Get student UUIDs
SET @student1_uuid = (SELECT uuid FROM users WHERE email = 'student1@test.com');
SET @student2_uuid = (SELECT uuid FROM users WHERE email = 'student2@test.com');
SET @student3_uuid = (SELECT uuid FROM users WHERE email = 'student3@test.com');
SET @student4_uuid = (SELECT uuid FROM users WHERE email = 'student4@test.com');
SET @student5_uuid = (SELECT uuid FROM users WHERE email = 'student5@test.com');

-- Step 3: Create sample courses by instructor
-- ============================================
INSERT INTO course (title, description, creator_id, status, is_deleted, created_at, updated_at)
VALUES
    ('Introduction to JavaScript', 'Learn JavaScript fundamentals', @instructor_uuid, 'active', 0, NOW(), NOW()),
    ('React for Beginners', 'Build modern web apps with React', @instructor_uuid, 'active', 0, NOW(), NOW()),
    ('Advanced TypeScript', 'Master TypeScript programming', @instructor_uuid, 'active', 0, NOW(), NOW()),
    ('Node.js Backend Development', 'Create powerful backend APIs', @instructor_uuid, 'active', 0, NOW(), NOW()),
    ('Database Design Principles', 'Learn SQL and database modeling', @instructor_uuid, 'draft', 0, NOW(), NOW());

-- Get course IDs
SET @course1_id = (SELECT id FROM course WHERE title = 'Introduction to JavaScript' AND creator_id = @instructor_uuid LIMIT 1);
SET @course2_id = (SELECT id FROM course WHERE title = 'React for Beginners' AND creator_id = @instructor_uuid LIMIT 1);
SET @course3_id = (SELECT id FROM course WHERE title = 'Advanced TypeScript' AND creator_id = @instructor_uuid LIMIT 1);
SET @course4_id = (SELECT id FROM course WHERE title = 'Node.js Backend Development' AND creator_id = @instructor_uuid LIMIT 1);

-- Step 4: Create enrollments
-- ============================================
INSERT INTO enrol (user_id, course_id, created_at)
VALUES
    -- Course 1 enrollments
    (@student1_uuid, @course1_id, NOW()),
    (@student2_uuid, @course1_id, NOW()),
    (@student3_uuid, @course1_id, NOW()),
    (@student4_uuid, @course1_id, NOW()),
    -- Course 2 enrollments
    (@student1_uuid, @course2_id, NOW()),
    (@student2_uuid, @course2_id, NOW()),
    (@student5_uuid, @course2_id, NOW()),
    -- Course 3 enrollments
    (@student1_uuid, @course3_id, NOW()),
    (@student3_uuid, @course3_id, NOW()),
    (@student4_uuid, @course3_id, NOW()),
    (@student5_uuid, @course3_id, NOW()),
    -- Course 4 enrollments
    (@student2_uuid, @course4_id, NOW()),
    (@student3_uuid, @course4_id, NOW());

-- Step 5: Create instructor tasks
-- ============================================
INSERT INTO instructor_tasks (instructor_id, task_type, status, description, due_date, action_label, created_at)
VALUES
    (@instructor_uuid, 'Review', 'Pending', 'Review student assignment for JavaScript course', DATE_ADD(NOW(), INTERVAL 3 DAY), 'Review Now', NOW()),
    (@instructor_uuid, 'Grading', 'Urgent', 'Grade quiz submissions for React course', DATE_ADD(NOW(), INTERVAL 1 DAY), 'Grade', NOW()),
    (@instructor_uuid, 'Feedback', 'Pending', 'Provide feedback on TypeScript project', DATE_ADD(NOW(), INTERVAL 5 DAY), 'Give Feedback', NOW()),
    (@instructor_uuid, 'Review', 'Pending', 'Review discussion forum posts', DATE_ADD(NOW(), INTERVAL 7 DAY), 'Review', NOW());

-- Step 6: Create learning hours logs
-- ============================================
-- Insert learning hours for the past 5 weeks
INSERT INTO learning_hours_log (user_id, course_id, hours_spent, log_date, created_at)
VALUES
    -- Week 1 (5 weeks ago)
    (@student1_uuid, @course1_id, 2.5, DATE_SUB(NOW(), INTERVAL 35 DAY), NOW()),
    (@student2_uuid, @course1_id, 3.0, DATE_SUB(NOW(), INTERVAL 35 DAY), NOW()),
    (@student3_uuid, @course2_id, 1.5, DATE_SUB(NOW(), INTERVAL 34 DAY), NOW()),
    -- Week 2 (4 weeks ago)
    (@student1_uuid, @course1_id, 4.0, DATE_SUB(NOW(), INTERVAL 28 DAY), NOW()),
    (@student2_uuid, @course2_id, 2.5, DATE_SUB(NOW(), INTERVAL 27 DAY), NOW()),
    (@student4_uuid, @course3_id, 3.5, DATE_SUB(NOW(), INTERVAL 26 DAY), NOW()),
    -- Week 3 (3 weeks ago)
    (@student1_uuid, @course2_id, 5.0, DATE_SUB(NOW(), INTERVAL 21 DAY), NOW()),
    (@student3_uuid, @course3_id, 4.5, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()),
    (@student5_uuid, @course2_id, 2.0, DATE_SUB(NOW(), INTERVAL 19 DAY), NOW()),
    -- Week 4 (2 weeks ago)
    (@student2_uuid, @course4_id, 6.0, DATE_SUB(NOW(), INTERVAL 14 DAY), NOW()),
    (@student3_uuid, @course1_id, 3.5, DATE_SUB(NOW(), INTERVAL 13 DAY), NOW()),
    (@student4_uuid, @course3_id, 4.0, DATE_SUB(NOW(), INTERVAL 12 DAY), NOW()),
    -- Week 5 (current week)
    (@student1_uuid, @course1_id, 5.5, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW()),
    (@student2_uuid, @course2_id, 4.5, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW()),
    (@student3_uuid, @course3_id, 3.0, DATE_SUB(NOW(), INTERVAL 4 DAY), NOW()),
    (@student4_uuid, @course1_id, 2.5, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()),
    (@student5_uuid, @course2_id, 6.0, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW());

-- Step 7: Verify data was created
-- ============================================
SELECT 'Data Created Successfully!' as Status;

SELECT
    'Total Courses' as Metric,
    COUNT(*) as Value
FROM course
WHERE creator_id = @instructor_uuid AND is_deleted = 0

UNION ALL

SELECT
    'Total Students',
    COUNT(DISTINCT e.user_id)
FROM enrol e
INNER JOIN course c ON e.course_id = c.id
WHERE c.creator_id = @instructor_uuid

UNION ALL

SELECT
    'Total Enrollments',
    COUNT(*)
FROM enrol e
INNER JOIN course c ON e.course_id = c.id
WHERE c.creator_id = @instructor_uuid

UNION ALL

SELECT
    'Total Tasks',
    COUNT(*)
FROM instructor_tasks
WHERE instructor_id = @instructor_uuid

UNION ALL

SELECT
    'Total Learning Hours',
    CAST(SUM(lhl.hours_spent) AS CHAR)
FROM learning_hours_log lhl
INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
INNER JOIN course c ON e.course_id = c.id
WHERE c.creator_id = @instructor_uuid;

-- Done!
SELECT '✓ Test data created successfully! Now test your dashboard.' as Result;
