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
    console.log('Adding certificate_title column to admin_issued_certificates table...');

    await promisePool.query(`
      ALTER TABLE admin_issued_certificates
      ADD COLUMN \`certificate_title\` VARCHAR(255) DEFAULT 'Certificate of Achievement' AFTER certificate_number
    `);

    console.log('SUCCESS: certificate_title column added successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists - no action needed.');
    } else {
      console.error('ERROR:', error.message);
    }
  } finally {
    pool.end();
    process.exit(0);
  }
}

runMigration();
