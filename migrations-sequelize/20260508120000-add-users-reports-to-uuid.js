'use strict';

/**
 * Add `users.reports_to_uuid` + index `idx_users_reports_to`.
 *
 * This column was previously only added at boot via `src/config/ensure_schema.js`
 * (safety-net self-heal). That works but is not visible to anyone reading the
 * Sequelize migration history, and it depends on `ensureSchema` running. This
 * migration formalizes the change so SequelizeMeta tracks it.
 *
 * IDEMPOTENCE: We do NOT use plain ALTER TABLE because the column may already
 * exist on environments where `ensureSchema` ran first (dev, staging, possibly
 * prod). We probe `information_schema` and only ALTER when missing — same
 * pattern used by `ensureSchema`. Running this migration twice, or against a
 * DB where the column already exists, is a no-op.
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
  // mysql2 returns rows directly here (not [results, metadata]) when used via
  // sequelize.query — handle both shapes defensively.
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

module.exports = {
  async up({ context: queryInterface }) {
    const hasCol = await columnExists(queryInterface, 'users', 'reports_to_uuid');
    if (!hasCol) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `users` ADD COLUMN `reports_to_uuid` VARCHAR(36) NULL'
      );
      console.log('  ✅ users.reports_to_uuid added');
    } else {
      console.log('  ⓘ users.reports_to_uuid already present — skipping ADD COLUMN');
    }

    const hasIdx = await indexExists(queryInterface, 'users', 'idx_users_reports_to');
    if (!hasIdx) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `users` ADD INDEX `idx_users_reports_to` (`reports_to_uuid`)'
      );
      console.log('  ✅ idx_users_reports_to added');
    } else {
      console.log('  ⓘ idx_users_reports_to already present — skipping ADD INDEX');
    }
  },

  async down({ context: queryInterface }) {
    const hasIdx = await indexExists(queryInterface, 'users', 'idx_users_reports_to');
    if (hasIdx) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `users` DROP INDEX `idx_users_reports_to`'
      );
    }
    const hasCol = await columnExists(queryInterface, 'users', 'reports_to_uuid');
    if (hasCol) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `users` DROP COLUMN `reports_to_uuid`'
      );
    }
  }
};
