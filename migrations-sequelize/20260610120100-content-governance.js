'use strict';

/**
 * Content governance lifecycle support.
 *
 * The `course.status` ENUM ('draft','pending','published','archived') and
 * `published_at` already exist. This migration adds the two actor columns the
 * approval workflow needs and a history table that records every lifecycle
 * transition.
 *
 *   course.submitted_by      — who pushed draft -> pending
 *   course.reviewed_by       — who approved / rejected
 *   course_lifecycle_history — append-only transition log
 *
 * IDEMPOTENCE: the two ALTERs probe information_schema first (the `course`
 * column may already exist where ensureSchema ran). The table is
 * CREATE TABLE IF NOT EXISTS.
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
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Number(row?.n || 0) > 0;
}

module.exports = {
  async up({ context: queryInterface }) {
    if (!(await columnExists(queryInterface, 'course', 'submitted_by'))) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `course` ADD COLUMN `submitted_by` VARCHAR(36) NULL'
      );
      console.log('  ✅ course.submitted_by added');
    } else {
      console.log('  ⓘ course.submitted_by already present — skipping');
    }

    if (!(await columnExists(queryInterface, 'course', 'reviewed_by'))) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `course` ADD COLUMN `reviewed_by` VARCHAR(36) NULL'
      );
      console.log('  ✅ course.reviewed_by added');
    } else {
      console.log('  ⓘ course.reviewed_by already present — skipping');
    }

    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`course_lifecycle_history\` (
         \`id\`          BIGINT PRIMARY KEY AUTO_INCREMENT,
         \`course_id\`   INT NOT NULL,
         \`from_status\` ENUM('draft','pending','published','archived') NULL,
         \`to_status\`   ENUM('draft','pending','published','archived') NOT NULL,
         \`actor_uuid\`  VARCHAR(36) NOT NULL,
         \`note\`        VARCHAR(500) NULL,
         \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         INDEX \`idx_clh_course\` (\`course_id\`),
         INDEX \`idx_clh_status\` (\`to_status\`)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );
    console.log('  ✅ course_lifecycle_history ready');
  },

  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `course_lifecycle_history`');
    if (await columnExists(queryInterface, 'course', 'reviewed_by')) {
      await queryInterface.sequelize.query('ALTER TABLE `course` DROP COLUMN `reviewed_by`');
    }
    if (await columnExists(queryInterface, 'course', 'submitted_by')) {
      await queryInterface.sequelize.query('ALTER TABLE `course` DROP COLUMN `submitted_by`');
    }
  }
};
