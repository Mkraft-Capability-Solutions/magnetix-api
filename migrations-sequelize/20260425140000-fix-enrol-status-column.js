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
 * Re-applies organization_member_activity_procedures.sql after removing
 * the dependency on `enrol.status`, which does not exist on every deployment
 * of this DB. `get_member_enrolled_courses` now derives the status from
 * `completed_at` and `progress`.
 *
 * Idempotent — every CREATE PROCEDURE is preceded by DROP PROCEDURE IF EXISTS.
 */
module.exports = {
  async up({ context: queryInterface }) {
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    for (const stmt of splitSql(sql)) {
      await queryInterface.sequelize.query(stmt);
    }
  },

  async down() {
    // No-op: rolling back would re-introduce the broken dependency.
  }
};
