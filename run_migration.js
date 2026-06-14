/**
 * Script to run SQL migrations
 * Handles DELIMITER statements for stored procedures
 * Usage: node run_migration.js <migration_file.sql>
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration(migrationFile) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'magnetix_db',
    multipleStatements: true
  });

  try {
    console.log('Connected to database:', process.env.DB_NAME);
    console.log('Running migration:', migrationFile);

    let sqlContent = fs.readFileSync(migrationFile, 'utf8');

    // Remove DELIMITER commands and replace with proper syntax
    sqlContent = sqlContent.replace(/DELIMITER \/\//g, '');
    sqlContent = sqlContent.replace(/DELIMITER ;/g, '');

    // Split by procedure boundaries
    const statements = sqlContent
      .split(/(?:^|\n)(?=CREATE|DROP|INSERT|ALTER|DELETE|UPDATE|SELECT ')/gi)
      .filter(stmt => stmt.trim());

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;

      try {
        // Replace // with ; in stored procedures
        const processed = trimmed.replace(/\/\//g, ';');
        await connection.query(processed);
        successCount++;
      } catch (error) {
        console.error(`\n✗ Failed to execute statement:`);
        console.error(trimmed.substring(0, 100) + '...');
        console.error('Error:', error.message);
        errorCount++;
      }
    }

    console.log(`\n✓ Migration completed!`);
    console.log(`  Success: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`  Errors: ${errorCount} statements`);
    }

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run_migration.js <migration_file.sql>');
  process.exit(1);
}

const fullPath = path.resolve(migrationFile);

if (!fs.existsSync(fullPath)) {
  console.error('Migration file not found:', fullPath);
  process.exit(1);
}

runMigration(fullPath);
