# Instructor Dashboard - Zero Data Issue - Troubleshooting Guide

## Problem
The instructor dashboard is showing all zeros and empty data arrays.

## Root Cause
One or more of the following issues:
1. ✗ No courses created by the logged-in instructor
2. ✗ Empty database tables (enrol, instructor_tasks, learning_hours_log)
3. ✗ User role is not set to Instructor (role_id = 2)
4. ✗ Incorrect creator_id on courses

---

## Quick Fix Steps

### Step 1: Check Database Connection
1. Open XAMPP Control Panel
2. Start MySQL if not running
3. Click "Admin" button for MySQL (opens phpMyAdmin)
4. Verify `magnetix_db` database exists in the left sidebar

### Step 2: Run Diagnostic Queries
1. In phpMyAdmin, select `magnetix_db` database
2. Click "SQL" tab
3. Copy and paste from `diagnostic_queries.sql` file
4. Run each query block one at a time
5. Note the results

**Key Queries to Run:**
```sql
-- Find instructor users
SELECT uuid, email, role_id, first_name, last_name
FROM users
WHERE role_id = 2 AND is_deleted = 0;

-- Check total courses
SELECT COUNT(*) FROM course WHERE is_deleted = 0;

-- Check if logged-in user has courses (replace with your UUID)
SELECT COUNT(*) FROM course WHERE creator_id = 'YOUR-UUID-HERE' AND is_deleted = 0;
```

### Step 3: Identify Your Instructor UUID
**Option A: From diagnostic query results** (Step 2 above)

**Option B: Check browser console**
1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to Application > Local Storage or Session Storage
4. Look for `user` or `auth` data
5. Find the `uuid` field

**Option C: Use debug endpoint** (see below)

### Step 4: Seed Test Data
1. Open `seed_instructor_test_data.sql` file
2. Find line that says:
   ```sql
   UPDATE users SET role_id = 2 WHERE email = 'your-email@example.com';
   ```
3. **REPLACE** `'your-email@example.com'` with your actual login email
4. In phpMyAdmin, select `magnetix_db` database
5. Go to SQL tab
6. Copy and paste the ENTIRE `seed_instructor_test_data.sql` file
7. Click "Go" button to execute
8. Verify you see "Data Created Successfully!" message

### Step 5: Verify Data Was Created
Run these verification queries in phpMyAdmin:
```sql
-- Check instructor exists
SELECT uuid, email, role_id FROM users WHERE role_id = 2;

-- Check courses exist (replace UUID)
SELECT COUNT(*) FROM course WHERE creator_id = 'YOUR-UUID-HERE';

-- Check enrollments exist
SELECT COUNT(*) FROM enrol;

-- Check tasks exist
SELECT COUNT(*) FROM instructor_tasks;
```

### Step 6: Test Dashboard
1. Restart your Node.js server (Ctrl+C, then `npm start`)
2. Log into your app as the instructor
3. Go to Dashboard page
4. Check browser console for debug logs (should see "📊 Dashboard getStats called...")
5. Check if data appears

---

## Using Debug Endpoints

### Restart Server
```bash
cd /Volumes/Shweta/LMS\ Migration/LXP-Enterprise/magnetix-api
npm start
```

### Test Endpoints in Browser or Postman

**1. Test Database Connection**
```
GET http://localhost:5111/api/instructor/dashboard/debug/connection
```
Expected response:
```json
{
  "success": true,
  "connection": {
    "status": "Connected ✓",
    "database": "magnetix_db",
    "serverTime": "2026-01-06 ...",
    "testQuery": "Passed ✓"
  }
}
```

**2. Get Table Counts**
```
GET http://localhost:5111/api/instructor/dashboard/debug/tables
```
Expected response:
```json
{
  "success": true,
  "tableCounts": {
    "users": 10,
    "course": 5,
    "enrol": 13,
    "instructor_tasks": 4,
    "learning_hours_log": 17
  }
}
```

**3. Get Comprehensive Debug Info**
```
GET http://localhost:5111/api/instructor/dashboard/debug
```
This will show:
- Your instructor UUID
- Whether you exist in database
- Your role ID
- Count of your courses
- Count of enrollments in your courses
- Sample courses
- Diagnosis and recommendations

---

## Common Issues & Solutions

### Issue 1: "Instructor user not found"
**Solution:** Your session UUID doesn't match any user in database
```sql
-- Check which users exist
SELECT uuid, email, role_id FROM users;

-- Update specific user to be instructor
UPDATE users SET role_id = 2 WHERE email = 'your-email@example.com';
```

### Issue 2: "User is not an instructor"
**Solution:** Your role_id is not 2
```sql
-- Fix: Set role to instructor (replace UUID)
UPDATE users SET role_id = 2 WHERE uuid = 'YOUR-UUID-HERE';
```

### Issue 3: "No courses created by this instructor"
**Solution:** Run `seed_instructor_test_data.sql` OR create courses manually
```sql
-- Quick test: Create one course
INSERT INTO course (title, description, creator_id, status, is_deleted, created_at, updated_at)
VALUES ('Test Course', 'Test Description', 'YOUR-UUID-HERE', 'active', 0, NOW(), NOW());
```

### Issue 4: "No courses in entire database"
**Solution:** Database is empty, run `seed_instructor_test_data.sql`

### Issue 5: Tables don't exist
**Solution:** Run migrations
```bash
cd /Volumes/Shweta/LMS\ Migration/LXP-Enterprise/magnetix-api/migrations
# Run each migration file in phpMyAdmin
```

---

## Check Server Logs

When you load the dashboard, check your Node.js terminal for logs like:
```
📊 Dashboard getStats called with instructorId: abc-123-def-456
  ├─ Total Students: 5
  ├─ Active Courses: 4
  ├─ Pending Reviews: 3
  └─ Total Enrollments: 13
```

If you see all zeros, that confirms no data exists for that instructor.

---

## Manual Testing Checklist

- [ ] XAMPP MySQL is running
- [ ] Database `magnetix_db` exists
- [ ] User exists with role_id = 2 (instructor)
- [ ] Courses exist with creator_id matching instructor UUID
- [ ] Enrollments exist
- [ ] Node.js server is running
- [ ] Logged in as instructor user
- [ ] Debug endpoint shows data
- [ ] Dashboard displays statistics

---

## Files Created/Modified

**Created:**
- `/magnetix-api/diagnostic_queries.sql` - SQL queries to run in phpMyAdmin
- `/magnetix-api/seed_instructor_test_data.sql` - Seed data for testing
- `/magnetix-api/src/controllers/instructor/dashboard_debug_controller.js` - Debug endpoints
- `/magnetix-api/INSTRUCTOR_DASHBOARD_FIX.md` - This file

**Modified:**
- `/magnetix-api/src/services/instructor/dashboard_service.js` - Added console.log debugging
- `/magnetix-api/src/routes/instructor/dashboard_routes.js` - Added debug routes

---

## Next Steps if Still Not Working

1. Share the output of the debug endpoint: `/api/instructor/dashboard/debug`
2. Share the results of diagnostic queries
3. Share Node.js server logs when loading dashboard
4. Check browser console for any errors

---

## Clean Up (After Fixing)

Once dashboard works, you can optionally:
1. Remove debug endpoints from routes (comment out lines 66-87 in dashboard_routes.js)
2. Remove console.log statements from dashboard_service.js
3. Keep seed data for future testing or delete test users/courses

---

**Last Updated:** January 6, 2026
