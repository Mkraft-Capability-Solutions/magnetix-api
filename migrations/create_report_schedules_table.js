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
    console.log('Creating report_schedules table...');

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS report_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_type VARCHAR(50) NOT NULL DEFAULT 'analytics',
        frequency ENUM('daily', 'weekly', 'monthly') NOT NULL,
        day_of_week TINYINT NULL COMMENT '0=Sun, 1=Mon ... 6=Sat',
        day_of_month TINYINT NULL COMMENT '1-28',
        time_of_day TIME NOT NULL,
        timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
        recipients JSON NOT NULL,
        report_format VARCHAR(10) DEFAULT 'pdf',
        is_active TINYINT(1) DEFAULT 1,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_sent_at TIMESTAMP NULL,
        FOREIGN KEY (created_by) REFERENCES users(uuid) ON DELETE CASCADE
      )
    `);

    console.log('SUCCESS: report_schedules table created successfully!');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists - no action needed.');
    } else {
      console.error('ERROR:', error.message);
    }
  } finally {
    await pool.promise().end();
    process.exit(0);
  }
}

runMigration();
