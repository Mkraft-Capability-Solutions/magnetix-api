'use strict';

/**
 * Byte Video — AI short-video generation jobs + results.
 *
 * A row is created when a user submits a "command" (prompt) on the Byte Video
 * page. A background scheduler picks up `status='pending'` rows, runs the
 * configured generation provider (default = "explainer": Gemini script -> TTS
 * narration + captioned slides -> ffmpeg mp4), and writes the result back
 * (`status` -> 'completed' | 'failed', `output_filename`, etc.).
 *
 * `created_by` is the user uuid (users.uuid). `creator_role` records which
 * role page produced it ('super_admin' | 'instructor') for listing/auditing.
 *
 * CREATE TABLE IF NOT EXISTS keeps it idempotent across restarts.
 */

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`byte_videos\` (
         \`id\`                  BIGINT PRIMARY KEY AUTO_INCREMENT,
         \`created_by\`          VARCHAR(36) NOT NULL,
         \`creator_role\`        VARCHAR(32) NOT NULL,
         \`command\`             TEXT NOT NULL,
         \`title\`               VARCHAR(255) NULL,
         \`status\`              ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
         \`provider\`            VARCHAR(32) NOT NULL DEFAULT 'explainer',
         \`script_json\`         JSON NULL,
         \`output_filename\`     VARCHAR(255) NULL,
         \`thumbnail_filename\`  VARCHAR(255) NULL,
         \`duration_seconds\`    INT NULL,
         \`error_message\`       TEXT NULL,
         \`created_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         \`updated_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         INDEX \`idx_byte_videos_owner\` (\`created_by\`, \`status\`),
         INDEX \`idx_byte_videos_status\` (\`status\`)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );
    console.log('  ✅ byte_videos ready');
  },

  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `byte_videos`');
  }
};
