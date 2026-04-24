'use strict';

const fs = require('fs');
const path = require('path');

function splitSql(sql) {
  const out = [];
  const lines = sql.split(/\r?\n/);
  let delimiter = ';';
  let buffer = '';

  const flushOnDelimiter = () => {
    const parts = buffer.split(delimiter);
    buffer = parts.pop();
    for (const p of parts) {
      const stmt = p.trim();
      if (stmt) out.push(stmt);
    }
  };

  for (const line of lines) {
    const delimMatch = line.trim().match(/^DELIMITER\s+(\S+)$/i);
    if (delimMatch) {
      flushOnDelimiter();
      const leftover = buffer.trim();
      if (leftover) {
        out.push(leftover);
        buffer = '';
      }
      delimiter = delimMatch[1];
      continue;
    }
    buffer += line + '\n';
    if (buffer.includes(delimiter)) flushOnDelimiter();
  }

  const tail = buffer.trim();
  if (tail) out.push(tail);

  return out.filter((s) => s.replace(/--.*$/gm, '').trim().length > 0);
}

const SQL_PATH = path.join(
  __dirname,
  '..',
  'src',
  'sql',
  'organization_member_activity_procedures.sql'
);

/**
 * Hardening pass. Re-applies organization_member_activity_procedures.sql
 * after a cross-check against shipping code removed two unsupported column
 * references:
 *   - `enrol.completed_at` (not present on every deployment; derived now)
 *   - `feedback_responses.{score,max_score,percentage}` (optional columns,
 *     returned as NULL when absent)
 *
 * Idempotent: every CREATE PROCEDURE is preceded by DROP PROCEDURE IF EXISTS.
 */
module.exports = {
  async up({ context: queryInterface }) {
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    for (const stmt of splitSql(sql)) {
      await queryInterface.sequelize.query(stmt);
    }
  },

  async down() {
    // No-op — rolling this back would re-introduce the broken columns.
  }
};
