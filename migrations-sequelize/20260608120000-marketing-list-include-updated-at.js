'use strict';

/**
 * Re-deploys the marketing stored procedures so the campaign list/return now
 * includes `updated_at as updatedAt`. The notification history uses this to show
 * a draft's last-modified time (instead of its creation time, which never
 * changes on edit and looked stale).
 *
 * Re-runs src/sql/marketing_setup.sql, which is idempotent
 * (CREATE TABLE IF NOT EXISTS + DROP PROCEDURE IF EXISTS before CREATE), so it
 * simply refreshes the procedures to the updated definition.
 */

const path = require('path');
const { runSqlFile } = require('../src/config/sql_file_runner');

module.exports = {
  async up({ context: queryInterface }) {
    await runSqlFile(queryInterface, path.join(__dirname, '../src/sql/marketing_setup.sql'));
    console.log('  ✅ marketing procedures refreshed (campaign list now returns updatedAt)');
  },

  async down() {
    // No-op: refreshing a procedure body is not meaningfully reversible.
  }
};
