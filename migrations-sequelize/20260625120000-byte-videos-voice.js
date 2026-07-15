'use strict';

/**
 * Add `voice_id` to byte_videos so each job records the chosen narration voice
 * (ElevenLabs voice id). Idempotent: skips if the column already exists.
 */
module.exports = {
  async up({ context: queryInterface }) {
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE `byte_videos` ADD COLUMN `voice_id` VARCHAR(64) NULL AFTER `provider`'
      );
      console.log('  ✅ byte_videos.voice_id added');
    } catch (e) {
      if (/duplicate column|exists/i.test(e.message)) {
        console.log('  ℹ️  byte_videos.voice_id already present');
      } else {
        throw e;
      }
    }
  },

  async down({ context: queryInterface }) {
    try {
      await queryInterface.sequelize.query('ALTER TABLE `byte_videos` DROP COLUMN `voice_id`');
    } catch (_) { /* ignore */ }
  },
};
