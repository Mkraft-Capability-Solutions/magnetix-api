'use strict';

/**
 * Fix `get_member_enrolled_courses` and `get_student_dashboard_stats`.
 *
 * Both procedures referenced columns that do not exist on the live DB:
 *   - get_member_enrolled_courses read `enrol.progress` and
 *     `course_progress.completed_at` -> "Unknown column 'e.progress'", breaking
 *     the admin/manager "member learning history" (enrolled courses) view.
 *   - get_student_dashboard_stats read `course_progress.completed_at` ->
 *     "Unknown column 'cp.completed_at'", breaking the student dashboard AND the
 *     member overview card.
 * The corrected bodies derive progress from completed course_progress rows vs
 * the course's course_lesson count, and use course_progress.last_access for
 * activity timestamps.
 *
 * Single source of truth: the CREATE bodies live in procedures_catalog.js and
 * are ALSO reconciled on every boot by ensureProcedures() (drift-proof). This
 * migration just applies them eagerly on deploy.
 *
 * NOTE: no DELIMITER here — the driver sends each CREATE PROCEDURE body as a
 * single statement.
 */

const {
  GET_MEMBER_ENROLLED_COURSES_CREATE,
  GET_STUDENT_DASHBOARD_STATS_CREATE,
} = require('../src/config/procedures_catalog');

const DROP_ENROLLED = 'DROP PROCEDURE IF EXISTS `get_member_enrolled_courses`';
const DROP_DASHBOARD = 'DROP PROCEDURE IF EXISTS `get_student_dashboard_stats`';

async function apply(queryInterface) {
  await queryInterface.sequelize.query(DROP_ENROLLED);
  await queryInterface.sequelize.query(GET_MEMBER_ENROLLED_COURSES_CREATE);
  await queryInterface.sequelize.query(DROP_DASHBOARD);
  await queryInterface.sequelize.query(GET_STUDENT_DASHBOARD_STATS_CREATE);
  console.log('  ✅ get_member_enrolled_courses + get_student_dashboard_stats recreated (schema-correct)');
}

module.exports = {
  async up({ context: queryInterface }) {
    await apply(queryInterface);
  },

  async down({ context: queryInterface }) {
    // Forward-only: the previous versions were the bug, so there is no safe
    // rollback target. Leaving the corrected procedures in place.
    await apply(queryInterface);
  },
};
