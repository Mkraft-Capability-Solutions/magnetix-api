'use strict';

/**
 * Fix `sp_get_course_completion_report`.
 *
 * The deployed version computed completedCount as
 *   COUNT(DISTINCT CASE WHEN e.last_updated IS NOT NULL THEN e.user_id END)
 * which counts EVERY enrolment as "completed" (last_updated is virtually never
 * null) -> ~100% completion for every course, in both the SuperAdmin and
 * instructor course-completion reports. This recreates it with the real
 * definition (all course lessons completed), matching the KPI band / funnel.
 *
 * Single source of truth: the CREATE body lives in procedures_catalog.js and is
 * ALSO reconciled on every boot by ensureProcedures() (drift-proof). This
 * migration just applies it eagerly on deploy.
 *
 * NOTE: no DELIMITER here — the driver sends the whole CREATE PROCEDURE body as
 * a single statement.
 */

const { COURSE_COMPLETION_REPORT_CREATE } = require('../src/config/procedures_catalog');

const DROP = 'DROP PROCEDURE IF EXISTS `sp_get_course_completion_report`';

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.sequelize.query(DROP);
    await queryInterface.sequelize.query(COURSE_COMPLETION_REPORT_CREATE);
    console.log('  ✅ sp_get_course_completion_report recreated (real lesson-completion definition)');
  },

  async down({ context: queryInterface }) {
    // Forward-only: the previous version was the bug, so there is no safe
    // rollback target. Leaving the corrected procedure in place.
    await queryInterface.sequelize.query(DROP);
    await queryInterface.sequelize.query(COURSE_COMPLETION_REPORT_CREATE);
  },
};
