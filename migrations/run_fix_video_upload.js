/**
 * Migration Script: Fix video_upload column in course_lesson table
 *
 * This script adds the video_upload column to the course_lesson table if it doesn't exist.
 * Run this with: node migrations/run_fix_video_upload.js
 */

const { promisePool } = require("../src/config/db");

async function runMigration() {
  try {
    console.log("Starting migration: Fix video_upload column in course_lesson table");
    console.log("=".repeat(60));

    // Check if column exists
    console.log("\nChecking if video_upload column exists...");
    const [existingColumns] = await promisePool.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE
        TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_lesson'
        AND COLUMN_NAME = 'video_upload'
    `);

    if (existingColumns[0].count > 0) {
      console.log("✅ Column already exists. No changes needed.");
    } else {
      console.log("Column does not exist. Adding it now...");

      // Add the column
      await promisePool.query(`
        ALTER TABLE course_lesson
        ADD COLUMN video_upload VARCHAR(500) NULL
        AFTER scorm_package
      `);

      console.log("✅ Column added successfully!");
    }

    // Verify the column exists
    console.log("\n" + "=".repeat(60));
    console.log("Verifying column existence...");
    const [columns] = await promisePool.query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE
        TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_lesson'
        AND COLUMN_NAME = 'video_upload'
    `);

    if (columns.length > 0) {
      console.log("\n✅ SUCCESS: video_upload column exists!");
      console.log("Column details:", columns[0]);
    } else {
      console.log("\n❌ ERROR: video_upload column was not created!");
    }

    console.log("\n" + "=".repeat(60));
    console.log("Migration completed!");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
