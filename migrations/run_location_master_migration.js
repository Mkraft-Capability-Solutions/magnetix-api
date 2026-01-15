const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

const promisePool = pool.promise();

async function runMigration() {
  try {
    console.log('='.repeat(50));
    console.log('LOCATION MASTER TABLES MIGRATION');
    console.log('='.repeat(50));

    // Step 1: Create tables and insert states
    console.log('\n[1/2] Creating master tables and inserting India states...');
    const createTablesSql = fs.readFileSync(
      path.join(__dirname, 'create_location_master_tables.sql'),
      'utf8'
    );
    await promisePool.query(createTablesSql);
    console.log('SUCCESS: Master tables created and states inserted!');

    // Step 2: Insert districts
    console.log('\n[2/2] Inserting India districts...');
    const districtsSql = fs.readFileSync(
      path.join(__dirname, 'seed_india_districts.sql'),
      'utf8'
    );
    await promisePool.query(districtsSql);
    console.log('SUCCESS: All districts inserted!');

    // Verification
    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION');
    console.log('='.repeat(50));

    const [countries] = await promisePool.query('SELECT COUNT(*) as count FROM countries');
    const [states] = await promisePool.query('SELECT COUNT(*) as count FROM states');
    const [districts] = await promisePool.query('SELECT COUNT(*) as count FROM districts');

    console.log(`Countries: ${countries[0].count}`);
    console.log(`States/UTs: ${states[0].count}`);
    console.log(`Districts: ${districts[0].count}`);

    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));

  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Tables already exist - skipping creation.');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.log('Data already exists - skipping insertion.');
    } else {
      console.error('ERROR:', error.message);
      console.error('Code:', error.code);
    }
  } finally {
    pool.end();
    process.exit(0);
  }
}

runMigration();
