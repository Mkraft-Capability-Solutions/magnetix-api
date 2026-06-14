# MySQL Character Set Fix Guide

## Problem
The database has tables using `cp850` character set, which is incompatible with the `utf8mb4_0900_ai_ci` collation used in the stored procedures. This causes the error:
```
COLLATION 'utf8mb4_0900_ai_ci' is not valid for CHARACTER SET 'cp850'
```

## Solution
Convert all tables to `utf8mb4` character set, which is the modern UTF-8 standard for MySQL.

## Steps to Fix

### 1. Backup Your Database (IMPORTANT!)
```bash
# Using MySQL command line
mysqldump -u root lms_db > backup_lms_db.sql
```

### 2. Convert Database and All Tables to UTF8MB4

**Option A: Using the provided SQL script**

Run the fix-charset.sql file:
```bash
# From command line
mysql -u root lms_db < src/sql/fix-charset.sql

# Or using MySQL Workbench or any SQL client
# Open file: src/sql/fix-charset.sql and execute all queries
```

**Option B: Manual SQL commands**

Connect to your MySQL database and run:

```sql
-- Set database default to UTF8MB4
ALTER DATABASE lms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Convert all tables
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE students CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE student_corporate_info CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE course CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE category CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE enrol CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE course_progress CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE lessons CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE quiz CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE quiz_questions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE user_points CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE student_certificates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE training_locations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE training_rooms CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE trainers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- For any other tables not listed:
SELECT CONCAT('ALTER TABLE ', TABLE_NAME, ' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'lms_db'
AND TABLE_COLLATION NOT LIKE 'utf8mb4%';
```

### 3. Update Stored Procedures

Run the fix-stored-procedures.sql file:
```bash
mysql -u root lms_db < src/sql/fix-stored-procedures.sql

# Or execute through SQL client
# Open file: src/sql/fix-stored-procedures.sql and execute all queries
```

This will recreate the stored procedures without the problematic COLLATE clauses.

## Verification

After running the fixes, verify everything is working:

```sql
-- Check database charset
SELECT @@character_set_database, @@collation_database;

-- Check table charsets
SELECT TABLE_NAME, TABLE_COLLATION, CHARACTER_SET_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'lms_db'
ORDER BY TABLE_NAME;

-- Should show no cp850 tables
SELECT TABLE_NAME, CHARACTER_SET_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'lms_db'
AND CHARACTER_SET_NAME = 'cp850';
```

## Troubleshooting

**If you get "Access denied" errors:**
- Make sure you're using the correct username and password
- If no password, remove the `-p` flag
- Use `-p` flag if password is needed: `mysql -u root -p lms_db < file.sql`

**If tables are in use during conversion:**
- Make sure no application is connected to the database
- Stop your Node.js server temporarily
- Run the conversion scripts
- Restart the server

**If something goes wrong:**
- Restore from backup: `mysql -u root lms_db < backup_lms_db.sql`
- Contact support with the specific error message

## Files Involved

- `src/sql/fix-charset.sql` - Database and table character set conversion
- `src/sql/fix-stored-procedures.sql` - Stored procedure recreation without problematic collations

## What Changed

1. All tables now use `utf8mb4` character set instead of `cp850`
2. Collation is set to `utf8mb4_unicode_ci` (universally compatible)
3. Stored procedures `sp_get_all_locations` and `sp_get_all_rooms` have been updated to remove explicit COLLATE clauses
4. String comparisons now work correctly across all parameters and columns
