-- =============================================
-- Department Performance Dummy Data
-- This script adds department and corporate info for users
-- =============================================

USE magnetix_db;

-- Insert corporate info for users that don't have it
-- This creates department data for 100 users randomly
INSERT INTO student_corporate_info (user_id, organization_name, department, designation, employee_id, created_at, updated_at)
SELECT
    u.uuid,
    'Demo Company',
    ELT(FLOOR(1 + RAND() * 6), 'Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'),
    ELT(FLOOR(1 + RAND() * 5), 'Junior Developer', 'Senior Developer', 'Manager', 'Associate', 'Specialist'),
    CONCAT('EMP', LPAD(FLOOR(RAND() * 10000), 4, '0')),
    NOW(),
    NOW()
FROM users u
WHERE u.role_id = 1
  AND u.is_deleted = 0
  AND u.uuid NOT IN (SELECT user_id FROM student_corporate_info)
LIMIT 100;

-- Verify the department distribution
SELECT
    COALESCE(sci.department, 'Unassigned') as department,
    COUNT(DISTINCT u.uuid) as user_count,
    COUNT(DISTINCT e.user_id) as users_with_enrollments,
    ROUND(COUNT(DISTINCT e.user_id) * 100.0 / NULLIF(COUNT(DISTINCT u.uuid), 0), 0) as completion_percentage
FROM users u
LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
LEFT JOIN enrol e ON u.uuid = e.user_id
WHERE u.is_deleted = 0 AND u.role_id = 1
GROUP BY COALESCE(sci.department, 'Unassigned')
ORDER BY user_count DESC;
