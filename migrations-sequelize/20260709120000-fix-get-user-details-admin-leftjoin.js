'use strict';

/**
 * Fix `get_user_details` for Admins / Super Admins.
 *
 * The procedure joined the `admins` table for BOTH role 3 (Admin) and role 4
 * (Super Admin), with an INNER JOIN. But Super Admin profiles live in the
 * separate `super_admins` table, so a super admin got 0 rows -> "User not
 * found" (e.g. GET /users/me fails, breaking course creation), or — after a
 * LEFT JOIN — a row with NULL name ("null null" in the header).
 *
 * Fix: role 3 -> LEFT JOIN `admins`, role 4 -> LEFT JOIN `super_admins`. LEFT
 * JOIN keeps the core user record even when the profile row is missing.
 * Student (1) and Instructor (2) branches are unchanged.
 *
 * NOTE: no DELIMITER here — the driver sends the whole CREATE PROCEDURE body as
 * a single statement, so its internal `;` are fine.
 */

// Single source of truth for the procedure body (shared with the boot-time
// self-heal in ensure_schema.js -> ensureProcedures). See procedures_catalog.js.
const {
  GET_USER_DETAILS_CREATE: CREATE_LEFT_JOIN,
  GET_USER_DETAILS_CREATE_LEGACY: CREATE_INNER_JOIN,
} = require('../src/config/procedures_catalog');

const DROP = 'DROP PROCEDURE IF EXISTS `get_user_details`';

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.sequelize.query(DROP);
    await queryInterface.sequelize.query(CREATE_LEFT_JOIN);
    console.log('  ✅ get_user_details recreated (role 3 -> admins, role 4 -> super_admins)');
  },

  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query(DROP);
    await queryInterface.sequelize.query(CREATE_INNER_JOIN);
  },
};
