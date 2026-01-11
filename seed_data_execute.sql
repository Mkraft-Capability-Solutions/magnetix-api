-- Add data for existing instructor: instructor@milekraft.com
-- UUID: b4147cae-e2df-4bdb-9651-4569b100fb51

SET @instructor_uuid = 'b4147cae-e2df-4bdb-9651-4569b100fb51';

-- Add instructor tasks
INSERT INTO instructor_tasks (instructor_id, task_type, status, description, due_date, action_label, created_at)
VALUES
    (@instructor_uuid, 'Review', 'Pending', 'Review student assignments for Digital Marketing course', DATE_ADD(NOW(), INTERVAL 3 DAY), 'Review Now', NOW()),
    (@instructor_uuid, 'Grading', 'Urgent', 'Grade quiz submissions for AI course', DATE_ADD(NOW(), INTERVAL 1 DAY), 'Grade', NOW()),
    (@instructor_uuid, 'Feedback', 'Pending', 'Provide feedback on Leadership project', DATE_ADD(NOW(), INTERVAL 5 DAY), 'Give Feedback', NOW()),
    (@instructor_uuid, 'Review', 'Pending', 'Review discussion forum posts', DATE_ADD(NOW(), INTERVAL 7 DAY), 'Review', NOW()),
    (@instructor_uuid, 'Grading', 'Urgent', 'Grade final exam for Entrepreneurial course', DATE_ADD(NOW(), INTERVAL 2 DAY), 'Grade', NOW());

-- Use actual enrolled students (found from existing enrollments)
SET @enrolled1 = '4313a2aa-ee2b-4a8d-98af-9c94f99b3626'; -- Student in course 34
SET @enrolled2 = 'c4402201-aa6d-45e0-a9a7-9319aa63792c'; -- Student in course 34
SET @enrolled3 = '56a74721-2861-417f-b235-a7b66ffd5718'; -- Student in course 35

-- Add learning hours logs for past 5 weeks
INSERT INTO learning_hours_log (user_id, course_id, hours_spent, log_date, created_at)
VALUES
    -- Week 1 (5 weeks ago)
    (@enrolled1, 34, 2.5, DATE_SUB(NOW(), INTERVAL 35 DAY), NOW()),
    (@enrolled2, 34, 3.0, DATE_SUB(NOW(), INTERVAL 35 DAY), NOW()),
    (@enrolled3, 35, 1.5, DATE_SUB(NOW(), INTERVAL 34 DAY), NOW()),
    -- Week 2 (4 weeks ago)
    (@enrolled1, 34, 4.0, DATE_SUB(NOW(), INTERVAL 28 DAY), NOW()),
    (@enrolled2, 34, 2.5, DATE_SUB(NOW(), INTERVAL 27 DAY), NOW()),
    (@enrolled3, 35, 3.5, DATE_SUB(NOW(), INTERVAL 26 DAY), NOW()),
    -- Week 3 (3 weeks ago)
    (@enrolled1, 34, 5.0, DATE_SUB(NOW(), INTERVAL 21 DAY), NOW()),
    (@enrolled2, 34, 4.5, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()),
    (@enrolled3, 35, 2.0, DATE_SUB(NOW(), INTERVAL 19 DAY), NOW()),
    -- Week 4 (2 weeks ago)
    (@enrolled1, 34, 6.0, DATE_SUB(NOW(), INTERVAL 14 DAY), NOW()),
    (@enrolled2, 34, 3.5, DATE_SUB(NOW(), INTERVAL 13 DAY), NOW()),
    (@enrolled3, 35, 4.0, DATE_SUB(NOW(), INTERVAL 12 DAY), NOW()),
    -- Week 5 (current week)
    (@enrolled1, 34, 5.5, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW()),
    (@enrolled2, 34, 4.5, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW()),
    (@enrolled3, 35, 3.0, DATE_SUB(NOW(), INTERVAL 4 DAY), NOW()),
    (@enrolled1, 34, 2.5, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()),
    (@enrolled2, 34, 6.0, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW());

-- Verify data
SELECT 'Tasks Added' as Status, COUNT(*) as Count FROM instructor_tasks WHERE instructor_id = @instructor_uuid
UNION ALL
SELECT 'Learning Hours Added', COUNT(*) FROM learning_hours_log lhl
    INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
    INNER JOIN course c ON e.course_id = c.id
    WHERE c.creator_id = @instructor_uuid;

SELECT '✓ Test data created for instructor@milekraft.com' as Result;
