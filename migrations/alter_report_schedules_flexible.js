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

/**
 * Helper: check if a column exists in a table
 */
async function columnExists(table, column) {
  const [rows] = await promisePool.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column]
  );
  return rows[0].cnt > 0;
}

/**
 * Helper: safely run a query, log result, and continue on error
 */
async function safeRun(label, queryFn) {
  try {
    await queryFn();
    console.log(`  ✅ ${label}`);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log(`  ⏭️  ${label} — column already exists, skipping`);
    } else {
      console.error(`  ❌ ${label} — ${error.message}`);
    }
  }
}

async function runMigration() {
  try {
    console.log('Altering report_schedules table for flexible scheduling...\n');

    // 1. Change frequency ENUM to include new types
    await safeRun('Update frequency ENUM', async () => {
      await promisePool.query(`
        ALTER TABLE report_schedules
          MODIFY COLUMN frequency ENUM('once', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'custom') NOT NULL DEFAULT 'weekly'
      `);
    });

    // 2. Add schedule_name column
    if (!(await columnExists('report_schedules', 'schedule_name'))) {
      await safeRun('Add schedule_name column', async () => {
        await promisePool.query(`
          ALTER TABLE report_schedules
            ADD COLUMN schedule_name VARCHAR(100) NULL AFTER report_type
        `);
      });
    } else {
      console.log('  ⏭️  schedule_name column already exists, skipping');
    }

    // 3. Add days_of_week JSON column
    if (!(await columnExists('report_schedules', 'days_of_week'))) {
      await safeRun('Add days_of_week column', async () => {
        await promisePool.query(`
          ALTER TABLE report_schedules
            ADD COLUMN days_of_week JSON NULL
        `);
      });
    } else {
      console.log('  ⏭️  days_of_week column already exists, skipping');
    }

    // 4. Add days_of_month JSON column
    if (!(await columnExists('report_schedules', 'days_of_month'))) {
      await safeRun('Add days_of_month column', async () => {
        await promisePool.query(`
          ALTER TABLE report_schedules
            ADD COLUMN days_of_month JSON NULL
        `);
      });
    } else {
      console.log('  ⏭️  days_of_month column already exists, skipping');
    }

    // 5. Add specific_dates JSON column
    if (!(await columnExists('report_schedules', 'specific_dates'))) {
      await safeRun('Add specific_dates column', async () => {
        await promisePool.query(`
          ALTER TABLE report_schedules
            ADD COLUMN specific_dates JSON NULL
        `);
      });
    } else {
      console.log('  ⏭️  specific_dates column already exists, skipping');
    }

    // 6. Add repeat_end_date column
    if (!(await columnExists('report_schedules', 'repeat_end_date'))) {
      await safeRun('Add repeat_end_date column', async () => {
        await promisePool.query(`
          ALTER TABLE report_schedules
            ADD COLUMN repeat_end_date DATE NULL
        `);
      });
    } else {
      console.log('  ⏭️  repeat_end_date column already exists, skipping');
    }

    // 7. Migrate existing data: copy day_of_week to days_of_week array
    await safeRun('Migrate existing weekly schedules', async () => {
      await promisePool.query(`
        UPDATE report_schedules
          SET days_of_week = JSON_ARRAY(day_of_week)
          WHERE frequency = 'weekly' AND day_of_week IS NOT NULL AND days_of_week IS NULL
      `);
    });

    // 8. Migrate existing data: copy day_of_month to days_of_month array
    await safeRun('Migrate existing monthly schedules', async () => {
      await promisePool.query(`
        UPDATE report_schedules
          SET days_of_month = JSON_ARRAY(day_of_month)
          WHERE frequency = 'monthly' AND day_of_month IS NOT NULL AND days_of_month IS NULL
      `);
    });

    console.log('\nSUCCESS: report_schedules table altered for flexible scheduling!');
  } catch (error) {
    console.error('FATAL ERROR:', error.message);
  } finally {
    await pool.promise().end();
    process.exit(0);
  }
}

runMigration();
