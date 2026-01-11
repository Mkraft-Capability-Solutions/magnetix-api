-- ============================================
-- INSTRUCTOR DASHBOARD DIAGNOSTIC QUERIES
-- Run these in phpMyAdmin to diagnose the issue
-- ============================================

-- Step 1: Check if required tables exist
-- ============================================
SHOW TABLES LIKE 'users';
SHOW TABLES LIKE 'course';
SHOW TABLES LIKE 'enrol';
SHOW TABLES LIKE 'instructor_tasks';
SHOW TABLES LIKE 'learning_hours_log';

-- Step 2: Check all users and their roles
-- ============================================
SELECT
    uuid,
    email,
    role_id,
    CASE role_id
        WHEN 1 THEN 'Student'
        WHEN 2 THEN 'Instructor'
        WHEN 3 THEN 'Admin'
        ELSE 'Unknown'
    END as role_name,
    is_deleted
FROM users
ORDER BY role_id, email;

-- Step 3: Find instructor users specifically
-- ============================================
SELECT uuid, email, role_id, first_name, last_name
FROM users
WHERE role_id = 2 AND is_deleted = 0;

-- Step 4: Check total courses in database
-- ============================================
SELECT COUNT(*) as total_courses
FROM course
WHERE is_deleted = 0;

-- Step 5: Check courses by creator (REPLACE <UUID> with your instructor UUID)
-- ============================================
-- First, find your instructor UUID from Step 3, then run:
/*
SELECT
    c.id,
    c.title,
    c.creator_id,
    c.status,
    u.email as creator_email,
    u.role_id as creator_role
FROM course c
LEFT JOIN users u ON c.creator_id = u.uuid
WHERE c.is_deleted = 0
ORDER BY c.created_at DESC;
*/

-- Step 6: Check enrollments
-- ============================================
SELECT COUNT(*) as total_enrollments FROM enrol;

SELECT
    e.id,
    e.user_id,
    e.course_id,
    c.title as course_name,
    u.email as student_email
FROM enrol e
INNER JOIN course c ON e.course_id = c.id
INNER JOIN users u ON e.user_id = u.uuid
LIMIT 10;

-- Step 7: Check instructor tasks
-- ============================================
SELECT COUNT(*) as total_tasks FROM instructor_tasks;

SELECT
    id,
    instructor_id,
    task_type,
    status,
    description,
    due_date
FROM instructor_tasks
LIMIT 10;

-- Step 8: Check learning hours log
-- ============================================
SELECT COUNT(*) as total_hours_logs FROM learning_hours_log;

SELECT *
FROM learning_hours_log
LIMIT 10;

-- Step 9: CRITICAL - Check if specific instructor has data
-- ============================================
-- REPLACE '<INSTRUCTOR_UUID>' with the UUID from Step 3
/*
-- Courses by this instructor
SELECT COUNT(*) as my_courses
FROM course
WHERE creator_id = '<INSTRUCTOR_UUID>' AND is_deleted = 0;

-- Students enrolled in this instructor's courses
SELECT COUNT(DISTINCT e.user_id) as my_students
FROM enrol e
INNER JOIN course c ON e.course_id = c.id
WHERE c.creator_id = '<INSTRUCTOR_UUID>' AND c.is_deleted = 0;

-- Tasks for this instructor
SELECT COUNT(*) as my_tasks
FROM instructor_tasks
WHERE instructor_id = '<INSTRUCTOR_UUID>';
*/

-- Step 10: Check table structures
-- ============================================
DESCRIBE users;
DESCRIBE course;
DESCRIBE enrol;
DESCRIBE instructor_tasks;
DESCRIBE learning_hours_log;
