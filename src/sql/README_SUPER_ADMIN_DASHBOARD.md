# Super Admin Dashboard - Database Setup Guide

This guide explains how to set up the database stored procedures and tables for the Super Admin Dashboard.

## File Location
`/magnetix-api/src/sql/super_admin_dashboard_procedures.sql`

## What This File Creates

### Tables
1. **super_admin_dashboard_stats** - Stores daily snapshots of platform-wide statistics
2. **super_admin_tasks** - Stores tasks for super admin users (system/organization level)

Note: Uses the existing `learning_hours_log` table from the admin dashboard setup.

### Stored Procedures
1. **sp_get_super_admin_dashboard_stats** - Returns platform-wide statistics
2. **sp_get_super_admin_top_courses** - Returns top courses across all organizations
3. **sp_get_super_admin_tasks** - Returns super admin tasks
4. **sp_get_super_admin_learning_hours_trend** - Returns weekly learning hours trend
5. **sp_get_super_admin_learning_progress** - Returns monthly learning progress
6. **sp_perform_super_admin_task_action** - Performs actions on tasks (approve/reject/remind)

## Installation Steps

### 1. Using MySQL Command Line

```bash
# Connect to your MySQL database
mysql -u your_username -p your_database_name

# Run the SQL file
source /path/to/magnetix-api/src/sql/super_admin_dashboard_procedures.sql;
```

### 2. Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database
3. Go to File → Open SQL Script
4. Select `super_admin_dashboard_procedures.sql`
5. Click the Execute button (⚡)

### 3. Using phpMyAdmin

1. Login to phpMyAdmin
2. Select your database
3. Click on the "SQL" tab
4. Click "Choose File" and select `super_admin_dashboard_procedures.sql`
5. Click "Go"

### 4. Using Command Line with File Path

```bash
mysql -u your_username -p your_database_name < /path/to/super_admin_dashboard_procedures.sql
```

## Testing the Installation

After running the SQL file, verify the installation by running these test queries:

```sql
-- Test 1: Get dashboard statistics
CALL sp_get_super_admin_dashboard_stats(NULL, NULL);

-- Test 2: Get top 5 courses
CALL sp_get_super_admin_top_courses(NULL, NULL, 5);

-- Test 3: Get super admin tasks
CALL sp_get_super_admin_tasks(NULL, NULL, NULL, 10);

-- Test 4: Get learning hours trend
CALL sp_get_super_admin_learning_hours_trend(NULL, NULL);

-- Test 5: Get learning progress
CALL sp_get_super_admin_learning_progress(NULL, NULL);

-- Test 6: Perform a task action (approve task with ID 1)
CALL sp_perform_super_admin_task_action(1, 'approve', NULL);
```

## Sample Data Included

The SQL file includes sample data for:
- 20 super admin tasks (system management, organization management, etc.)
- 8 days of historical dashboard statistics
- Uses learning hours from the admin dashboard setup

## API Endpoints Using These Procedures

Once installed, these procedures will be called by the following API endpoints:

- `GET /api/super-admin/dashboard/stats` → `sp_get_super_admin_dashboard_stats`
- `GET /api/super-admin/dashboard/top-courses` → `sp_get_super_admin_top_courses`
- `GET /api/super-admin/dashboard/tasks` → `sp_get_super_admin_tasks`
- `GET /api/super-admin/dashboard/learning-hours` → `sp_get_super_admin_learning_hours_trend`
- `GET /api/super-admin/dashboard/learning-progress` → `sp_get_super_admin_learning_progress`
- `POST /api/super-admin/dashboard/tasks/:id/action` → `sp_perform_super_admin_task_action`

## Troubleshooting

### Error: "Procedure already exists"
The SQL file includes `DROP PROCEDURE IF EXISTS` statements, so this shouldn't happen. If it does, manually drop the procedures:

```sql
DROP PROCEDURE IF EXISTS sp_get_super_admin_dashboard_stats;
DROP PROCEDURE IF EXISTS sp_get_super_admin_top_courses;
DROP PROCEDURE IF EXISTS sp_get_super_admin_tasks;
DROP PROCEDURE IF EXISTS sp_get_super_admin_learning_hours_trend;
DROP PROCEDURE IF EXISTS sp_get_super_admin_learning_progress;
DROP PROCEDURE IF EXISTS sp_perform_super_admin_task_action;
```

### Error: "Table already exists"
The file uses `CREATE TABLE IF NOT EXISTS`, so this is safe. If you want to recreate tables:

```sql
DROP TABLE IF EXISTS super_admin_tasks;
DROP TABLE IF EXISTS super_admin_dashboard_stats;
```

### Error: "learning_hours_log doesn't exist"
This table should be created by running the admin dashboard procedures first:

```bash
mysql -u your_username -p your_database_name < /path/to/admin_dashboard_procedures.sql
```

## Dependencies

- Requires the `learning_hours_log` table from `admin_dashboard_procedures.sql`
- Requires `users` table with fields: uuid, role_id, status, is_deleted, created_at
- Requires `course` table with fields: id, title, status, is_deleted
- Requires `enrol` table with fields: id, course_id

## Customization

You can modify the following in the SQL file:

1. **Target hours** in `sp_get_super_admin_learning_progress` (currently 500 hours/month)
2. **Total capacity** in `sp_get_super_admin_top_courses` (currently 500)
3. **Sample data** at the bottom of the file
4. **Week range** in `sp_get_super_admin_learning_hours_trend` (currently 5 weeks)

## Next Steps

After installation:
1. Test the procedures using the test queries above
2. Start your Node.js API server
3. Test the API endpoints with a tool like Postman
4. Verify the Super Admin Dashboard in the frontend displays data correctly

## Support

If you encounter issues:
1. Check MySQL error logs
2. Verify all dependent tables exist
3. Ensure MySQL user has proper permissions (CREATE, DROP, EXECUTE)
4. Check that DELIMITER is supported in your MySQL client
