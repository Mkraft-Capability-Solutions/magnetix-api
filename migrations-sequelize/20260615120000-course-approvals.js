'use strict';

/**
 * Configurable course approval workflow.
 *
 * `course_approval_requests` holds, per course, whether the course requires
 * approval before publishing and who the designated approver is:
 *   - approver_type='user'  → a system user (non-learner) must approve in-app
 *                              (blocking; course stays 'pending' until decided).
 *   - approver_type='email' → an external email is notified ("course added with
 *                              your approval"); non-blocking.
 *
 * One current row per course (the service upserts by course_id).
 * CREATE TABLE IF NOT EXISTS keeps it idempotent alongside ensure_schema.
 */

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`course_approval_requests\` (
         \`id\`                BIGINT PRIMARY KEY AUTO_INCREMENT,
         \`course_id\`         INT NOT NULL,
         \`requires_approval\` TINYINT(1) NOT NULL DEFAULT 1,
         \`approver_type\`     ENUM('user','email') NOT NULL,
         \`approver_uuid\`     VARCHAR(36) NULL,
         \`approver_email\`    VARCHAR(255) NULL,
         \`status\`            ENUM('pending','approved','rejected','notified') NOT NULL DEFAULT 'pending',
         \`requested_by\`      VARCHAR(36) NULL,
         \`note\`              VARCHAR(500) NULL,
         \`requested_at\`      TIMESTAMP NULL,
         \`decided_at\`        TIMESTAMP NULL,
         \`created_at\`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         \`updated_at\`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         INDEX \`idx_car_course\` (\`course_id\`),
         INDEX \`idx_car_approver\` (\`approver_uuid\`, \`status\`)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );
    console.log('  ✅ course_approval_requests ready');
  },

  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `course_approval_requests`');
  }
};
