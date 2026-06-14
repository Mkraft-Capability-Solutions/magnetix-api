'use strict';

/**
 * ILT Resource Management — Location master FK support.
 *
 * 1. Adds `country_id` / `state_id` / `district_id` (+ indexes) to
 *    `training_locations`. The app now writes these on create/update so the
 *    Country/State/District dropdowns can be pre-selected on view/edit.
 * 2. Recreates `sp_get_all_locations` and `sp_get_location_by_id` so they
 *    return those ids (aliased as countryId/stateId/districtId).
 *
 * This formalizes what was previously applied by hand via
 * migrations/update_training_locations_fk.js + run_update_location_procedures.js
 * so SequelizeMeta tracks it and it runs automatically on deploy.
 *
 * IDEMPOTENT: columns are probed via information_schema before ALTER; the
 * procedures are always DROP ... IF EXISTS before CREATE. Safe to re-run and
 * safe on environments where the columns already exist (dev/staging where the
 * manual scripts ran first).
 */

async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS n
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = :table
        AND column_name = :column`,
    { replacements: { table, column } }
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Number(row?.n || 0) > 0;
}

async function indexExists(queryInterface, table, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS n
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = :table
        AND index_name = :indexName`,
    { replacements: { table, indexName } }
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Number(row?.n || 0) > 0;
}

// Add a nullable INT column + its index only when missing.
async function addFkColumn(queryInterface, column, afterColumn, indexName) {
  if (!(await columnExists(queryInterface, 'training_locations', column))) {
    await queryInterface.sequelize.query(
      `ALTER TABLE training_locations ADD COLUMN \`${column}\` INT NULL AFTER \`${afterColumn}\``
    );
    console.log(`  ✅ training_locations.${column} added`);
  } else {
    console.log(`  ⓘ training_locations.${column} already present — skipping`);
  }

  if (!(await indexExists(queryInterface, 'training_locations', indexName))) {
    await queryInterface.sequelize.query(
      `ALTER TABLE training_locations ADD INDEX \`${indexName}\` (\`${column}\`)`
    );
    console.log(`  ✅ index ${indexName} added`);
  } else {
    console.log(`  ⓘ index ${indexName} already present — skipping`);
  }
}

// NOTE: CREATE PROCEDURE is passed to the driver as a single statement, so no
// client-side DELIMITER handling is needed (DELIMITER is a CLI/phpMyAdmin-only
// concept). The semicolons inside the body are part of the one procedure body.
const CREATE_SP_GET_ALL_LOCATIONS = `
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
    l.country_id  AS countryId,
    l.state_id    AS stateId,
    l.district_id AS districtId,
    l.address,
    l.zip_code    AS zipCode,
    l.email,
    l.phone,
    l.capacity,
    l.timezone,
    l.manager,
    l.facilities,
    l.status,
    COUNT(r.id)   AS rooms,
    l.created_at  AS createdAt,
    l.updated_at  AS updatedAt
  FROM training_locations l
  LEFT JOIN training_rooms r ON l.id = r.location_id AND r.is_deleted = 0
  WHERE l.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR l.name LIKE CONCAT('%', p_search, '%') OR l.city LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR l.status = p_status)
  GROUP BY l.id
  ORDER BY l.created_at DESC;
END
`;

const CREATE_SP_GET_LOCATION_BY_ID = `
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
    l.country_id  AS countryId,
    l.state_id    AS stateId,
    l.district_id AS districtId,
    l.address,
    l.zip_code    AS zipCode,
    l.email,
    l.phone,
    l.capacity,
    l.timezone,
    l.manager,
    l.facilities,
    l.status,
    l.created_at  AS createdAt,
    l.updated_at  AS updatedAt
  FROM training_locations l
  WHERE l.id = p_location_id AND l.is_deleted = 0;

  SELECT
    r.id,
    r.name,
    r.room_number AS roomNumber,
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
`;

module.exports = {
  async up({ context: queryInterface }) {
    // 1. FK columns (+ indexes) — idempotent.
    await addFkColumn(queryInterface, 'country_id', 'country', 'idx_country_id');
    await addFkColumn(queryInterface, 'state_id', 'state', 'idx_state_id');
    await addFkColumn(queryInterface, 'district_id', 'city', 'idx_district_id');

    // 2. Read procedures — drop + recreate so they return the id columns.
    await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS sp_get_all_locations');
    await queryInterface.sequelize.query(CREATE_SP_GET_ALL_LOCATIONS);
    console.log('  ✅ sp_get_all_locations recreated');

    await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS sp_get_location_by_id');
    await queryInterface.sequelize.query(CREATE_SP_GET_LOCATION_BY_ID);
    console.log('  ✅ sp_get_location_by_id recreated');
  },

  async down({ context: queryInterface }) {
    // Roll back only the additive schema. The procedures are intentionally left
    // in place: reverting them to the pre-id versions would break the current
    // app, and they are harmless supersets of the originals.
    for (const [indexName, column] of [
      ['idx_district_id', 'district_id'],
      ['idx_state_id', 'state_id'],
      ['idx_country_id', 'country_id']
    ]) {
      if (await indexExists(queryInterface, 'training_locations', indexName)) {
        await queryInterface.sequelize.query(
          `ALTER TABLE training_locations DROP INDEX \`${indexName}\``
        );
      }
      if (await columnExists(queryInterface, 'training_locations', column)) {
        await queryInterface.sequelize.query(
          `ALTER TABLE training_locations DROP COLUMN \`${column}\``
        );
      }
    }
  }
};
