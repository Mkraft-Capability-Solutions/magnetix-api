'use strict';

/**
 * Knowledge Base audience targeting.
 *
 * 1. Ensures the four KB tables exist (they were historically created
 *    out-of-band and are not owned by any prior migration). CREATE ... IF NOT
 *    EXISTS makes this a no-op on installs where they already exist.
 * 2. Adds the nullable `audience_roles` column to kb_articles / kb_entries /
 *    kb_faqs. NULL/'' = Public (anyone, incl. logged-out); otherwise a CSV of
 *    role ids (1=Learner,2=Trainer,3=Admin,4=SuperAdmin). Existing rows stay
 *    NULL ⇒ remain Public, so nothing changes for current content.
 *
 * Fully idempotent — safe to re-run. The same DDL is also self-healed at boot
 * by `src/config/ensure_schema.js` (EXPECTED_TABLES + EXPECTED_COLUMNS), which
 * is the drift-proof backstop if this migration is ever skipped. The two never
 * conflict because both use IF NOT EXISTS / duplicate-column tolerance.
 */

const CREATE_TABLES = [
  {
    name: 'kb_entries',
    sql: `
      CREATE TABLE IF NOT EXISTS \`kb_entries\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`version\` VARCHAR(50) NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`published_date\` DATE NULL,
        \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
        \`audience_roles\` VARCHAR(50) NULL,
        \`created_by\` CHAR(36) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        INDEX \`idx_kb_entries_status\` (\`status\`),
        INDEX \`idx_kb_entries_date\` (\`published_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  },
  {
    name: 'kb_entry_items',
    sql: `
      CREATE TABLE IF NOT EXISTS \`kb_entry_items\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`kb_entry_id\` INT UNSIGNED NOT NULL,
        \`type\` VARCHAR(30) NOT NULL DEFAULT 'feature',
        \`description\` TEXT NULL,
        \`sort_order\` INT UNSIGNED DEFAULT 0,
        INDEX \`idx_kb_entry_items_entry\` (\`kb_entry_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  },
  {
    name: 'kb_faqs',
    sql: `
      CREATE TABLE IF NOT EXISTS \`kb_faqs\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`question\` VARCHAR(500) NOT NULL,
        \`answer\` TEXT NOT NULL,
        \`category\` VARCHAR(100) DEFAULT 'General',
        \`sort_order\` INT UNSIGNED DEFAULT 0,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`audience_roles\` VARCHAR(50) NULL,
        \`created_by\` CHAR(36) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        INDEX \`idx_kb_faqs_active\` (\`is_active\`),
        INDEX \`idx_kb_faqs_category\` (\`category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  },
  {
    name: 'kb_articles',
    sql: `
      CREATE TABLE IF NOT EXISTS \`kb_articles\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`title\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NULL,
        \`content\` TEXT NULL,
        \`excerpt\` VARCHAR(500) NULL,
        \`category\` VARCHAR(100) DEFAULT 'General',
        \`tags\` VARCHAR(500) NULL,
        \`cover_image\` VARCHAR(500) NULL,
        \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
        \`sort_order\` INT UNSIGNED DEFAULT 0,
        \`audience_roles\` VARCHAR(50) NULL,
        \`created_by\` CHAR(36) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        INDEX \`idx_kb_articles_status\` (\`status\`),
        INDEX \`idx_kb_articles_category\` (\`category\`),
        INDEX \`idx_kb_articles_slug\` (\`slug\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  },
];

const AUDIENCE_COLUMN_TABLES = ['kb_articles', 'kb_entries', 'kb_faqs'];

module.exports = {
  async up({ context: queryInterface }) {
    const q = queryInterface.sequelize;

    for (const t of CREATE_TABLES) {
      await q.query(t.sql);
      console.log(`  ✅ kb table ensured: ${t.name}`);
    }

    for (const table of AUDIENCE_COLUMN_TABLES) {
      try {
        await q.query(`ALTER TABLE \`${table}\` ADD COLUMN \`audience_roles\` VARCHAR(50) NULL`);
        console.log(`  ✅ ${table}.audience_roles added`);
      } catch (e) {
        if (/duplicate column|exists/i.test(e.message)) {
          console.log(`  ℹ️  ${table}.audience_roles already present`);
        } else {
          throw e;
        }
      }
    }
  },

  async down({ context: queryInterface }) {
    // Only reverse the additive column — do NOT drop the KB tables (they predate
    // this migration and hold user content).
    const q = queryInterface.sequelize;
    for (const table of AUDIENCE_COLUMN_TABLES) {
      try {
        await q.query(`ALTER TABLE \`${table}\` DROP COLUMN \`audience_roles\``);
      } catch (_) { /* ignore */ }
    }
  },
};
