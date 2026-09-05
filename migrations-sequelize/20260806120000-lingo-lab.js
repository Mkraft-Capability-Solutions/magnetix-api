'use strict';

/**
 * Lingo Lab AI — Phase 1 tables (profiles, vocabulary, spaced-repetition
 * progress, activity log, gamification stats).
 *
 * Additive only: all tables are `lingo_*` and touch nothing existing. They are
 * also created + seeded idempotently on first API use by
 * lingo_lab_service.ensureSchema(); this migration runs the same DDL (single
 * source of truth) for proper deploys.
 */

const { LINGO_SCHEMA_SQL } = require('../src/services/student/lingo_lab_service');

module.exports = {
  async up({ context: queryInterface }) {
    for (const ddl of LINGO_SCHEMA_SQL) {
      await queryInterface.sequelize.query(ddl);
    }
    console.log('  ✅ lingo_lab tables ensured');
  },

  async down({ context: queryInterface }) {
    for (const table of [
      'lingo_activity',
      'lingo_vocab_progress',
      'lingo_vocabulary',
      'lingo_stats',
      'lingo_profiles',
    ]) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  },
};
