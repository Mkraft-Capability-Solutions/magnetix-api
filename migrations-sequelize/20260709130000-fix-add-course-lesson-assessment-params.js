'use strict';

/**
 * Fix schema drift on `add_course_lesson`.
 *
 * The backend calls `add_course_lesson` with 17 args (title … + 4 assessment
 * params), but some databases still have an older 13-arg version (the loose
 * `migrations/fix_assessment_lesson_columns.sql` was never applied), causing:
 *   ER_SP_WRONG_NO_OF_ARGS: Incorrect number of arguments ... expected 13, got 17
 * That breaks ALL lesson adds (normal and "Add from Library").
 *
 * This ensures the 4 assessment columns exist on `course_lesson` and recreates
 * the procedure with the full 17-param signature. Idempotent.
 */

// Every column the procedure reads/writes. Added only if missing (safe,
// nullable/defaulted), healing schema drift on `course_lesson`.
const COLUMNS = [
  ['lesson_order', 'INT DEFAULT 0'],
  ['lesson_content_type', 'VARCHAR(50) NULL'],
  ['lesson_content_document', 'VARCHAR(500) NULL'],
  ['lesson_content_scorm', 'VARCHAR(500) NULL'],
  ['lesson_content_mp4', 'VARCHAR(500) NULL'],
  ['lesson_content_url', 'VARCHAR(1000) NULL'],
  ['lesson_duration', 'VARCHAR(100) NULL'],
  ['creator_id', 'VARCHAR(36) NULL'],
  ['last_updated_by', 'VARCHAR(36) NULL'],
  ['is_deleted', 'TINYINT(1) DEFAULT 0'],
  ['assessment_id', 'INT NULL DEFAULT NULL'],
  ['require_section_completion', 'TINYINT(1) DEFAULT 0'],
  ['assessment_start_date', 'DATE NULL DEFAULT NULL'],
  ['assessment_end_date', 'DATE NULL DEFAULT NULL'],
];

// Single source of truth for the procedure body (shared with the boot-time
// self-heal in ensure_schema.js -> ensureProcedures). See procedures_catalog.js.
const { ADD_COURSE_LESSON_CREATE: CREATE_SP } = require('../src/config/procedures_catalog');

module.exports = {
  async up({ context: queryInterface }) {
    const q = queryInterface.sequelize;
    // Add assessment columns if missing (MySQL has no ADD COLUMN IF NOT EXISTS).
    for (const [name, def] of COLUMNS) {
      const [rows] = await q.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'course_lesson' AND column_name = ?",
        { replacements: [name] }
      );
      if (!rows || rows.length === 0) {
        await q.query(`ALTER TABLE course_lesson ADD COLUMN \`${name}\` ${def}`);
        console.log(`  + course_lesson.${name} added`);
      }
    }
    await q.query('DROP PROCEDURE IF EXISTS add_course_lesson');
    await q.query(CREATE_SP);
    console.log('  ✅ add_course_lesson recreated with 17 params');
  },

  async down() {
    // Forward-only fix; no safe rollback (the old 13-arg version is the bug).
  },
};
