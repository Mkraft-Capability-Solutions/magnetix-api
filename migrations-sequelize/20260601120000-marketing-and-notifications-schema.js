'use strict';

/**
 * Marketing + Notifications schema.
 *
 * Formalizes the previously manual-only SQL files so SequelizeMeta tracks them
 * and they auto-apply on deploy (they were never wired into any runner, which
 * is why marketing "send" 500'd in environments where they hadn't been run by
 * hand):
 *   - src/sql/notifications_setup.sql  → notifications, email_logs tables + SPs
 *   - src/sql/marketing_setup.sql      → marketing_campaigns table + SPs
 *
 * IDEMPOTENT: both files use `CREATE TABLE IF NOT EXISTS` and
 * `DROP PROCEDURE IF EXISTS` before `CREATE PROCEDURE`, so re-running is safe.
 */

const path = require('path');
const { runSqlFile } = require('../src/config/sql_file_runner');

const SQL_DIR = path.join(__dirname, '../src/sql');

module.exports = {
  async up({ context: queryInterface }) {
    await runSqlFile(queryInterface, path.join(SQL_DIR, 'notifications_setup.sql'));
    console.log('  ✅ notifications + email_logs tables and SPs ensured');

    await runSqlFile(queryInterface, path.join(SQL_DIR, 'marketing_setup.sql'));
    console.log('  ✅ marketing_campaigns table and SPs ensured');
  },

  async down() {
    // No-op: these tables hold real campaign/notification data and the
    // procedures are shared infrastructure. Dropping them on rollback would be
    // destructive, so leave them in place.
  }
};
