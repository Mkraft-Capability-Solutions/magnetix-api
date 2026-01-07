-- =====================================================
-- Super Admin Dashboard - Test & Verification Queries
-- Run these queries to verify stored procedures are working
-- =====================================================

-- =====================================================
-- 1. Verify Tables Exist
-- =====================================================
SHOW TABLES LIKE 'super_admin%';
SHOW TABLES LIKE 'learning_hours_log';

-- =====================================================
-- 2. Verify Stored Procedures Exist
-- =====================================================
SHOW PROCEDURE STATUS WHERE Name LIKE 'sp_%super_admin%';

-- =====================================================
-- 3. Check Sample Data
-- =====================================================

-- Check super_admin_tasks table
SELECT
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_tasks,
    SUM(CASE WHEN status = 'Urgent' THEN 1 ELSE 0 END) as urgent_tasks
FROM super_admin_tasks;

-- Check super_admin_dashboard_stats table
SELECT * FROM super_admin_dashboard_stats ORDER BY stat_date DESC LIMIT 7;

-- Check learning_hours_log table (should have data from admin setup)
SELECT
    COUNT(*) as total_logs,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(hours_spent) as total_hours
FROM learning_hours_log;

-- =====================================================
-- 4. Test Each Stored Procedure
-- =====================================================

-- Test 1: Get Dashboard Statistics
-- Expected: 4 rows with stats (Total Users, Active Learners, Total Courses, Pending Tasks)
SELECT 'TEST 1: Dashboard Statistics' as test_name;
CALL sp_get_super_admin_dashboard_stats(NULL, NULL);

-- Test 2: Get Top Courses
-- Expected: Up to 5 rows with course data (name, enrolled, total)
SELECT 'TEST 2: Top 5 Courses' as test_name;
CALL sp_get_super_admin_top_courses(NULL, NULL, 5);

-- Test 3: Get Super Admin Tasks
-- Expected: Up to 10 rows with task data
SELECT 'TEST 3: Super Admin Tasks' as test_name;
CALL sp_get_super_admin_tasks(NULL, NULL, NULL, 10);

-- Test 4: Get Learning Hours Trend
-- Expected: Multiple rows showing weekly hours
SELECT 'TEST 4: Learning Hours Trend' as test_name;
CALL sp_get_super_admin_learning_hours_trend(NULL, NULL);

-- Test 5: Get Learning Progress
-- Expected: 1 row with totalHours, progressPercentage, trend, etc.
SELECT 'TEST 5: Learning Progress' as test_name;
CALL sp_get_super_admin_learning_progress(NULL, NULL);

-- =====================================================
-- 5. Test Task Actions
-- =====================================================

-- First, get a pending task ID
SELECT id, description, status
FROM super_admin_tasks
WHERE status = 'Pending'
LIMIT 1;

-- Test 6: Approve a task (replace 1 with actual task ID from above query)
SELECT 'TEST 6: Task Action - Approve' as test_name;
-- CALL sp_perform_super_admin_task_action(1, 'approve', NULL);

-- Verify the task was updated
-- SELECT id, status, completed_at FROM super_admin_tasks WHERE id = 1;

-- Test 7: Reject a task
SELECT 'TEST 7: Task Action - Reject' as test_name;
-- CALL sp_perform_super_admin_task_action(2, 'reject', NULL);

-- Test 8: Send reminder for a task
SELECT 'TEST 8: Task Action - Remind' as test_name;
-- CALL sp_perform_super_admin_task_action(3, 'remind', NULL);

-- =====================================================
-- 6. Test with Date Range Parameters
-- =====================================================

-- Test with specific date range (last 7 days)
SELECT 'TEST 9: Stats with Date Range' as test_name;
CALL sp_get_super_admin_dashboard_stats(
    DATE_SUB(CURDATE(), INTERVAL 7 DAY),
    CURDATE()
);

-- Test learning hours for specific period
SELECT 'TEST 10: Learning Hours for Last 3 Weeks' as test_name;
CALL sp_get_super_admin_learning_hours_trend(
    DATE_SUB(CURDATE(), INTERVAL 3 WEEK),
    CURDATE()
);

-- =====================================================
-- 7. Edge Case Testing
-- =====================================================

-- Test with invalid task ID
SELECT 'TEST 11: Invalid Task ID' as test_name;
CALL sp_perform_super_admin_task_action(99999, 'approve', NULL);

-- Test with limit parameter
SELECT 'TEST 12: Top 3 Courses' as test_name;
CALL sp_get_super_admin_top_courses(NULL, NULL, 3);

-- Test with admin ID filter
SELECT 'TEST 13: Tasks for Specific Admin' as test_name;
CALL sp_get_super_admin_tasks(1, NULL, NULL, 10);

-- =====================================================
-- 8. Performance Check
-- =====================================================

-- Check execution time for each procedure
SELECT 'Performance Test: Running all procedures' as test_name;

CALL sp_get_super_admin_dashboard_stats(NULL, NULL);
CALL sp_get_super_admin_top_courses(NULL, NULL, 5);
CALL sp_get_super_admin_tasks(NULL, NULL, NULL, 10);
CALL sp_get_super_admin_learning_hours_trend(NULL, NULL);
CALL sp_get_super_admin_learning_progress(NULL, NULL);

-- =====================================================
-- 9. Data Validation
-- =====================================================

-- Verify no NULL values in critical fields
SELECT 'Data Validation: Checking for NULL values' as test_name;

SELECT
    COUNT(*) as total_tasks,
    SUM(CASE WHEN description IS NULL THEN 1 ELSE 0 END) as null_descriptions,
    SUM(CASE WHEN due_date IS NULL THEN 1 ELSE 0 END) as null_due_dates,
    SUM(CASE WHEN status IS NULL THEN 1 ELSE 0 END) as null_statuses
FROM super_admin_tasks;

-- =====================================================
-- 10. Cleanup (Optional - Uncomment to reset)
-- =====================================================

-- Reset task statuses back to Pending/Urgent
-- UPDATE super_admin_tasks SET status = 'Pending', completed_at = NULL WHERE status = 'Completed';
-- UPDATE super_admin_tasks SET status = 'Pending', completed_at = NULL WHERE status = 'Rejected';

-- =====================================================
-- Expected Results Summary
-- =====================================================
/*
TEST 1: Should return 4 stats rows
TEST 2: Should return up to 5 course rows
TEST 3: Should return up to 10 task rows
TEST 4: Should return weekly hour data (multiple rows)
TEST 5: Should return 1 row with progress metrics
TEST 6-8: Should return success message
TEST 9-10: Should return filtered data based on date range
TEST 11: Should return error message "Task not found"
TEST 12: Should return exactly 3 courses
TEST 13: Should return tasks filtered by admin ID
*/

-- =====================================================
-- Success Indicators
-- =====================================================
/*
✓ All tables exist
✓ All 6 stored procedures exist
✓ Sample data is present in tables
✓ All procedures execute without errors
✓ Return values match expected structure
✓ Task actions update database correctly
*/
