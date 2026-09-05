'use strict';

/**
 * Lingo Lab — complete production setup (idempotent).
 *
 * Creates every Lingo Lab table and seeds default vocabulary for all supported
 * languages so production works out of the box. Safe to run on a fresh DB or on
 * top of a partially-created one:
 *   - All CREATE TABLE use IF NOT EXISTS.
 *   - Schema upgrades (is_active, the composite unique key, activity language)
 *     are guarded by information_schema checks — no-ops when already applied.
 *   - Seed vocabulary uses INSERT IGNORE (ignoreDuplicates) so re-runs add only
 *     new words.
 *
 * The runtime self-heal (ensureSchema / ensureConvSchema / ensureReadingSchema)
 * mirrors this exactly, so the app is resilient even if the migration is skipped.
 */

const { LINGO_SCHEMA_SQL } = require('../src/services/student/lingo_lab_service');
const { LINGO_CONV_SQL } = require('../src/services/student/lingo_conversation_service');
const { LINGO_READING_SQL } = require('../src/services/student/lingo_practice_service');
const SEED_VOCAB = require('../src/config/lingo_seed_data');

async function run(qi, sql) { await qi.sequelize.query(sql); }

async function colExists(qi, table, col) {
  const [rows] = await qi.sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${col}'`
  );
  return Number(rows[0].c) > 0;
}
async function idxExists(qi, table, idx) {
  const [rows] = await qi.sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = '${table}' AND index_name = '${idx}'`
  );
  return Number(rows[0].c) > 0;
}

async function apply(qi) {
  // 1. Tables
  for (const ddl of LINGO_SCHEMA_SQL) await run(qi, ddl);
  for (const ddl of LINGO_CONV_SQL) await run(qi, ddl);
  await run(qi, LINGO_READING_SQL);

  // 2. Idempotent upgrades for DBs created before multi-language support.
  if (!(await colExists(qi, 'lingo_profiles', 'is_active'))) {
    await run(qi, 'ALTER TABLE lingo_profiles ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1');
  }
  if (await idxExists(qi, 'lingo_profiles', 'uq_lingo_profile_user')) {
    await run(qi, 'ALTER TABLE lingo_profiles DROP INDEX uq_lingo_profile_user');
  }
  if (!(await idxExists(qi, 'lingo_profiles', 'uq_lingo_profile_user_lang'))) {
    await run(qi, 'ALTER TABLE lingo_profiles ADD UNIQUE KEY uq_lingo_profile_user_lang (user_id, target_language)');
  }
  if (!(await colExists(qi, 'lingo_activity', 'target_language'))) {
    await run(qi, 'ALTER TABLE lingo_activity ADD COLUMN target_language VARCHAR(50) NULL AFTER activity_type');
  }

  // 3. Seed default vocabulary for every language (INSERT IGNORE).
  try {
    const records = SEED_VOCAB.map((r) => ({
      target_language: r[0], category: r[1], word: r[2], translation: r[3],
      ipa: r[4], example_sentence: r[5], example_translation: r[6], difficulty: r[7],
    }));
    await qi.bulkInsert('lingo_vocabulary', records, { ignoreDuplicates: true });
    console.log(`  ✅ Lingo Lab: tables ensured + ${records.length} seed words across all languages`);
  } catch (e) {
    // Non-fatal: the app self-seeds on first use. Tables (the critical part) are done.
    console.warn('  ⚠️  Lingo Lab seed skipped:', e.message);
  }
}

module.exports = {
  async up({ context: queryInterface }) {
    await apply(queryInterface);
  },

  async down({ context: queryInterface }) {
    for (const t of [
      'lingo_conversation_messages', 'lingo_conversations', 'lingo_reading', 'lingo_settings',
      'lingo_activity', 'lingo_vocab_progress', 'lingo_vocabulary', 'lingo_progress_stats',
      'lingo_stats', 'lingo_profiles',
    ]) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  },
};
