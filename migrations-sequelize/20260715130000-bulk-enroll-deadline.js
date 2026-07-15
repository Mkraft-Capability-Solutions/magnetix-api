'use strict';

/**
 * Persist the "Assign Training" due date.
 *
 * The My Team "Assign Training" flow calls sp_bulk_enroll_users with an optional
 * due date, but the legacy procedure accepted `p_deadline` and never stored it —
 * `enrol` had no column to hold it. This migration:
 *   1. Adds a nullable `enrol.deadline` DATE column (idempotent),
 *   2. Recreates sp_bulk_enroll_users to write the deadline on insert and refresh
 *      it when the user is already enrolled, and
 *   3. Recreates sp_get_team_learning_history to surface the due date + an
 *      `overdue` flag in the My Team "Learning History" tab.
 *
 * The column is ALSO self-healed on every boot via EXPECTED_COLUMNS, and the
 * procedures via ensureProcedures() — both read the same source of truth
 * (procedures_catalog.js), so this migration and the boot-time heal can never
 * disagree. No manual SQL is ever required.
 *
 * NOTE: no DELIMITER — the driver sends each CREATE PROCEDURE body as one statement.
 */

const {
  SP_BULK_ENROLL_USERS_CREATE,
  SP_GET_TEAM_LEARNING_HISTORY_CREATE,
} = require('../src/config/procedures_catalog');

const DROP = 'DROP PROCEDURE IF EXISTS `sp_bulk_enroll_users`';
const DROP_HISTORY = 'DROP PROCEDURE IF EXISTS `sp_get_team_learning_history`';

async function ensureDeadlineColumn(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS c
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'enrol'
        AND column_name = 'deadline'`
  );
  const exists = Number(rows[0].c) > 0;
  if (!exists) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `enrol` ADD COLUMN `deadline` DATE NULL DEFAULT NULL'
    );
    console.log('  ✅ enrol.deadline column added');
  } else {
    console.log('  ✓ enrol.deadline already present');
  }
}

async function apply(queryInterface) {
  await ensureDeadlineColumn(queryInterface);
  await queryInterface.sequelize.query(DROP);
  await queryInterface.sequelize.query(SP_BULK_ENROLL_USERS_CREATE);
  console.log('  ✅ sp_bulk_enroll_users recreated (stores the due date)');
  await queryInterface.sequelize.query(DROP_HISTORY);
  await queryInterface.sequelize.query(SP_GET_TEAM_LEARNING_HISTORY_CREATE);
  console.log('  ✅ sp_get_team_learning_history recreated (surfaces the due date)');
}

module.exports = {
  async up({ context: queryInterface }) {
    await apply(queryInterface);
  },

  async down({ context: queryInterface }) {
    // Forward-only: the previous procedure silently dropped the deadline, so
    // there is no safe rollback target. The added column is nullable and
    // harmless, so we leave it in place.
    await apply(queryInterface);
  },
};
