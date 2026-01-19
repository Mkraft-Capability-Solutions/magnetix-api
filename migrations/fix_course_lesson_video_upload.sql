-- Migration to fix video_upload column issue in course_lesson table
-- This adds the video_upload column if it doesn't exist

-- Check if column exists and add it if missing
SET @dbname = DATABASE();
SET @tablename = 'course_lesson';
SET @columnname = 'video_upload';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT "Column already exists" AS message;',
  'ALTER TABLE course_lesson ADD COLUMN video_upload VARCHAR(500) AFTER scorm_package;'
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verify the column was added
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  CHARACTER_MAXIMUM_LENGTH,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
  TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'course_lesson'
  AND COLUMN_NAME = 'video_upload';
