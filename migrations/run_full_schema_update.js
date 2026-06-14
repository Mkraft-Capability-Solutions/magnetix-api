/**
 * Migration Script: Run full course management schema update
 *
 * This executes the complete schema file to ensure all stored procedures
 * are using the correct column names
 */

const { promisePool } = require("../src/config/db");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  try {
    console.log("Starting full schema update for course management");
    console.log("=".repeat(60));

    // Read the full schema file
    const schemaPath = path.join(__dirname, "../src/sql/course_management_schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("Schema file loaded successfully");
    console.log(`File size: ${schema.length} characters`);

    // Split by DELIMITER statements to handle stored procedures
    const sections = schema.split(/DELIMITER\s+/i);

    console.log("\nExecuting schema sections...\n");

    // Execute the first section (before first DELIMITER)
    if (sections[0] && sections[0].trim()) {
      const statements = sections[0]
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--") && !s.toUpperCase().startsWith("SELECT 'COURSE MANAGEMENT"));

      for (const stmt of statements) {
        try {
          await promisePool.query(stmt);
        } catch (err) {
          // Ignore some expected errors (tables already exist, etc.)
          if (!err.message.includes("already exists") && !err.message.includes("Duplicate")) {
            console.log(`Note: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }

    // Handle DELIMITER sections (stored procedures)
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];

      // Get the delimiter
      const delimiterMatch = section.match(/^(\S+)/);
      if (!delimiterMatch) continue;

      const delimiter = delimiterMatch[1];
      const content = section.substring(delimiter.length).trim();

      if (delimiter === "//") {
        // Split by // to get individual procedures
        const procedures = content
          .split("//")
          .map(p => p.trim())
          .filter(p => p.length > 0 && p.toUpperCase().includes("CREATE PROCEDURE"));

        for (const proc of procedures) {
          try {
            await promisePool.query(proc);
            // Extract procedure name for logging
            const nameMatch = proc.match(/CREATE PROCEDURE\s+(\w+)/i);
            if (nameMatch) {
              console.log(`✅ Created/Updated procedure: ${nameMatch[1]}`);
            }
          } catch (err) {
            console.error(`❌ Error creating procedure: ${err.message.substring(0, 200)}`);
          }
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Schema update completed!");

    // Verify key procedures exist
    console.log("\nVerifying stored procedures...");
    const [procedures] = await promisePool.query(`
      SELECT ROUTINE_NAME
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE()
      AND ROUTINE_TYPE = 'PROCEDURE'
      AND ROUTINE_NAME IN (
        'get_course_details_by_id',
        'get_course_enrolled_details',
        'get_course_basic_details',
        'add_course_lesson'
      )
      ORDER BY ROUTINE_NAME
    `);

    console.log("\nFound procedures:");
    procedures.forEach(p => console.log(`  ✓ ${p.ROUTINE_NAME}`));

    if (procedures.length < 4) {
      console.log("\n⚠️  Warning: Some procedures may not have been created");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
