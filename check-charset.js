const { promisePool } = require('./src/config/db');

async function checkCharset() {
  try {
    // Check database charset
    const [dbCharset] = await promisePool.query(
      "SELECT @@character_set_database as charset, @@collation_database as collation"
    );
    console.log('Database Charset:', dbCharset[0]);

    // Check table charsets
    const [tables] = await promisePool.query(`
      SELECT TABLE_NAME, TABLE_COLLATION, CHARACTER_SET_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'lms_db'
      ORDER BY TABLE_NAME
    `);
    
    console.log('\nTable Character Sets:');
    tables.forEach(table => {
      console.log(`${table.TABLE_NAME}: ${table.CHARACTER_SET_NAME} / ${table.TABLE_COLLATION}`);
    });

    // Check for cp850
    const [cp850Tables] = await promisePool.query(`
      SELECT TABLE_NAME, TABLE_COLLATION, CHARACTER_SET_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'lms_db' AND CHARACTER_SET_NAME = 'cp850'
    `);

    if (cp850Tables.length > 0) {
      console.log('\n⚠️ FOUND cp850 TABLES:');
      cp850Tables.forEach(table => {
        console.log(`${table.TABLE_NAME}: ${table.CHARACTER_SET_NAME}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCharset();
