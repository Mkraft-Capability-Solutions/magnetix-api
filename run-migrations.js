const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigrations() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'lms_db'
  };

  // Only add password if it's defined and not empty
  if (process.env.DB_PASSWORD) {
    dbConfig.password = process.env.DB_PASSWORD;
  }

  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('Starting database migrations...\n');

    // Run first migration
    const migration1Path = path.join(__dirname, 'migrations', 'add_subjective_assessment.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
    console.log('Running: add_subjective_assessment.sql');

    // Split by semicolon and execute each statement
    const statements1 = migration1SQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements1) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (err) {
          // Ignore "already exists" errors as columns might already be present
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate column')) {
            throw err;
          }
          console.log(`  ⓘ Skipped (already exists): ${statement.substring(0, 50)}...`);
        }
      }
    }
    console.log('✓ add_subjective_assessment.sql completed\n');

    // Run second migration
    const migration2Path = path.join(__dirname, 'migrations', 'add_assessment_scoring.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
    console.log('Running: add_assessment_scoring.sql');

    const statements2 = migration2SQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements2) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (err) {
          // Ignore "already exists" errors as columns might already be present
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate column')) {
            throw err;
          }
          console.log(`  ⓘ Skipped (already exists): ${statement.substring(0, 50)}...`);
        }
      }
    }
    console.log('✓ add_assessment_scoring.sql completed\n');

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
