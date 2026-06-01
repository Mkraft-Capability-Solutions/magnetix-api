'use strict';

/**
 * ILT Resource Management — trainer/room/location tables + stored procedures.
 *
 * Formalizes src/sql/ilt_resource_procedures.sql (previously manual-only) so it
 * auto-applies on deploy. Provides: training_locations / training_rooms /
 * trainers tables (IF NOT EXISTS) and all the sp_*_location / sp_*_room /
 * sp_*_trainer / sp_get_ilt_stats procedures.
 *
 * IMPORTANT: this file also contains OLD copies of `sp_get_all_locations` and
 * `sp_get_location_by_id` (without the country_id/state_id/district_id columns).
 * Those read procedures are owned by 20260521120000-location-master-fk-and-procs
 * (the FK-aware versions). We SKIP them here so this migration never clobbers
 * the good versions, regardless of apply order.
 *
 * IDEMPOTENT: tables use `CREATE TABLE IF NOT EXISTS`; procedures use
 * `DROP PROCEDURE IF EXISTS` before `CREATE PROCEDURE`.
 */

const path = require('path');
const { runSqlFile } = require('../src/config/sql_file_runner');

const SQL_FILE = path.join(__dirname, '../src/sql/ilt_resource_procedures.sql');

// Leave the FK-aware location read procedures to their dedicated migration.
const LOCATION_READ_SPS = /\bsp_get_all_locations\b|\bsp_get_location_by_id\b/i;

module.exports = {
  async up({ context: queryInterface }) {
    await runSqlFile(queryInterface, SQL_FILE, {
      skip: (stmt) => LOCATION_READ_SPS.test(stmt)
    });
    console.log('  ✅ ILT trainer/room/location tables + procedures ensured (FK-aware location read SPs left to 20260521120000)');
  },

  async down() {
    // No-op: shared tables (with data) + procedures the app depends on.
  }
};
