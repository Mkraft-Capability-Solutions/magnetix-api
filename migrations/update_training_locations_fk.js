const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

async function runMigration() {
  try {
    console.log('='.repeat(50));
    console.log('UPDATE TRAINING_LOCATIONS TABLE');
    console.log('='.repeat(50));

    // Add country_id, state_id, district_id columns
    console.log('\nAdding foreign key columns...');

    // Check if columns already exist
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'training_locations'
      AND COLUMN_NAME IN ('country_id', 'state_id', 'district_id')
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('country_id')) {
      await promisePool.query(`
        ALTER TABLE training_locations
        ADD COLUMN country_id INT NULL AFTER country,
        ADD INDEX idx_country_id (country_id)
      `);
      console.log('Added country_id column');
    } else {
      console.log('country_id column already exists');
    }

    if (!existingColumns.includes('state_id')) {
      await promisePool.query(`
        ALTER TABLE training_locations
        ADD COLUMN state_id INT NULL AFTER state,
        ADD INDEX idx_state_id (state_id)
      `);
      console.log('Added state_id column');
    } else {
      console.log('state_id column already exists');
    }

    if (!existingColumns.includes('district_id')) {
      await promisePool.query(`
        ALTER TABLE training_locations
        ADD COLUMN district_id INT NULL AFTER city,
        ADD INDEX idx_district_id (district_id)
      `);
      console.log('Added district_id column');
    } else {
      console.log('district_id column already exists');
    }

    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    pool.end();
    process.exit(0);
  }
}

runMigration();
