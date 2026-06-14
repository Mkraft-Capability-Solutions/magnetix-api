'use strict';

/**
 * Re-deploys the marketing stored procedures so sp_create_marketing_campaign
 * marks a campaign 'scheduled' whenever scheduled_for is set, instead of using
 * a timezone-fragile `scheduled_for > NOW()` comparison (scheduled_for is the
 * IST wall-clock the user picked, NOW() is the DB server timezone — so a valid
 * future time could be mislabeled 'draft').
 *
 * Re-runs src/sql/marketing_setup.sql, which is idempotent
 * (DROP PROCEDURE IF EXISTS before CREATE), so it just refreshes the procedures.
 */

const path = require('path');
const { runSqlFile } = require('../src/config/sql_file_runner');

module.exports = {
  async up({ context: queryInterface }) {
    await runSqlFile(queryInterface, path.join(__dirname, '../src/sql/marketing_setup.sql'));
    console.log('  ✅ marketing procedures refreshed (create now marks scheduled-from-schedule)');
  },

  async down() {
    // No-op: refreshing a procedure body is not meaningfully reversible.
  }
};
