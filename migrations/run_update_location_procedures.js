const mysql = require('mysql2');
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
    console.log('Updating location stored procedures...');

    // Drop existing procedures
    await promisePool.query('DROP PROCEDURE IF EXISTS sp_get_all_locations');
    await promisePool.query('DROP PROCEDURE IF EXISTS sp_get_location_by_id');
    console.log('Dropped existing procedures');

    // Create sp_get_all_locations
    await promisePool.query(`
      CREATE PROCEDURE sp_get_all_locations(
        IN p_search VARCHAR(100),
        IN p_status VARCHAR(20)
      )
      BEGIN
        SELECT
          l.id,
          l.name,
          l.city,
          l.state,
          l.country,
          l.country_id as countryId,
          l.state_id as stateId,
          l.district_id as districtId,
          l.address,
          l.zip_code as zipCode,
          l.email,
          l.phone,
          l.capacity,
          l.timezone,
          l.manager,
          l.facilities,
          l.status,
          COUNT(r.id) as rooms,
          l.created_at as createdAt,
          l.updated_at as updatedAt
        FROM training_locations l
        LEFT JOIN training_rooms r ON l.id = r.location_id AND r.is_deleted = 0
        WHERE l.is_deleted = 0
          AND (p_search IS NULL OR p_search = '' OR l.name LIKE CONCAT('%', p_search, '%') OR l.city LIKE CONCAT('%', p_search, '%'))
          AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR l.status = p_status)
        GROUP BY l.id
        ORDER BY l.created_at DESC;
      END
    `);
    console.log('Created sp_get_all_locations');

    // Create sp_get_location_by_id
    await promisePool.query(`
      CREATE PROCEDURE sp_get_location_by_id(
        IN p_location_id INT
      )
      BEGIN
        SELECT
          l.id,
          l.name,
          l.city,
          l.state,
          l.country,
          l.country_id as countryId,
          l.state_id as stateId,
          l.district_id as districtId,
          l.address,
          l.zip_code as zipCode,
          l.email,
          l.phone,
          l.capacity,
          l.timezone,
          l.manager,
          l.facilities,
          l.status,
          l.created_at as createdAt,
          l.updated_at as updatedAt
        FROM training_locations l
        WHERE l.id = p_location_id AND l.is_deleted = 0;

        SELECT
          r.id,
          r.name,
          r.room_number as roomNumber,
          r.floor,
          r.type,
          r.capacity,
          r.area,
          r.description,
          r.amenities,
          r.status
        FROM training_rooms r
        WHERE r.location_id = p_location_id AND r.is_deleted = 0
        ORDER BY r.name;
      END
    `);
    console.log('Created sp_get_location_by_id');

    console.log('\nSUCCESS: Location procedures updated!');
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    pool.end();
    process.exit(0);
  }
}

runMigration();
