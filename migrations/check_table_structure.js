/**
 * Script to check the actual structure of course_lesson table
 */

const { promisePool } = require("../src/config/db");

async function checkTable() {
  try {
    console.log("Checking course_lesson table structure...");
    console.log("=".repeat(60));

    const [columns] = await promisePool.query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE
        TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_lesson'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("\nColumns in course_lesson table:");
    console.log("=".repeat(60));
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.COLUMN_NAME}`);
      console.log(`   Type: ${col.COLUMN_TYPE}`);
      console.log(`   Nullable: ${col.IS_NULLABLE}`);
      console.log(`   Default: ${col.COLUMN_DEFAULT || "NULL"}`);
      console.log("");
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTable();
