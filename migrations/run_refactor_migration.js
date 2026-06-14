const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  console.log("Connected to database:", process.env.DB_NAME);

  const sqlFile = path.join(__dirname, "refactor_complete_migration.sql");
  const sql = fs.readFileSync(sqlFile, "utf8");

  // Split on DELIMITER to handle stored procedures
  const blocks = sql.split(/DELIMITER\s+\/\//i);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    let block = blocks[i].trim();

    if (!block) continue;

    // If this block ends with "DELIMITER ;" then it contains procedure(s)
    if (i > 0) {
      // This is a procedure block, split on // to get individual procedures
      const parts = block.split(/\/\//);
      for (const part of parts) {
        let stmt = part.replace(/DELIMITER\s*;/gi, "").trim();
        if (!stmt) continue;

        try {
          await connection.query(stmt);
          successCount++;
        } catch (err) {
          // Ignore "already exists" or "duplicate" errors
          if (
            err.code === "ER_TABLE_EXISTS_ERROR" ||
            err.code === "ER_DUP_FIELDNAME" ||
            err.code === "ER_DUP_KEYNAME"
          ) {
            console.log("  Skipped (already exists):", err.message.substring(0, 80));
          } else {
            console.error("  Error:", err.message.substring(0, 120));
            errorCount++;
          }
        }
      }
    } else {
      // Regular SQL statements block
      const statements = block
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const stmt of statements) {
        try {
          await connection.query(stmt);
          successCount++;
        } catch (err) {
          if (
            err.code === "ER_TABLE_EXISTS_ERROR" ||
            err.code === "ER_DUP_FIELDNAME" ||
            err.code === "ER_DUP_KEYNAME" ||
            err.code === "ER_DUP_ENTRY"
          ) {
            console.log("  Skipped (already exists):", err.message.substring(0, 80));
          } else {
            console.error("  Error:", err.message.substring(0, 120));
            errorCount++;
          }
        }
      }
    }
  }

  console.log("\n--- Migration Summary ---");
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  await connection.end();
  console.log("Database connection closed.");

  process.exit(errorCount > 0 ? 1 : 0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
