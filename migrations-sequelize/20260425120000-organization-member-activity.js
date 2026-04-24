'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Splits a SQL script that uses `DELIMITER` directives into individual
 * statements mysql2 can execute one at a time. Blocks between
 * `DELIMITER //` and `DELIMITER ;` are kept whole (so stored procedure
 * bodies with internal semicolons survive); plain sections are split
 * on semicolon.
 */
function splitSql(sql) {
  const out = [];
  const lines = sql.split(/\r?\n/);
  let delimiter = ';';
  let buffer = '';

  const flushOnDelimiter = () => {
    const parts = buffer.split(delimiter);
    buffer = parts.pop(); // any trailing partial stays in buffer
    for (const p of parts) {
      const stmt = p.trim();
      if (stmt) out.push(stmt);
    }
  };

  for (const raw of lines) {
    const line = raw;
    const delimMatch = line.trim().match(/^DELIMITER\s+(\S+)$/i);
    if (delimMatch) {
      // flush whatever is pending under the old delimiter before switching
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
    if (buffer.includes(delimiter)) {
      flushOnDelimiter();
    }
  }

  const tail = buffer.trim();
  if (tail) out.push(tail);

  // Strip leading comment-only statements
  return out.filter((s) => {
    const stripped = s.replace(/--.*$/gm, '').trim();
    return stripped.length > 0;
  });
}

const SQL_PATH = path.join(
  __dirname,
  '..',
  'src',
  'sql',
  'organization_member_activity_procedures.sql'
);

module.exports = {
  async up({ context: queryInterface }) {
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    for (const stmt of splitSql(sql)) {
      await queryInterface.sequelize.query(stmt);
    }
  },

  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS get_member_enrolled_courses');
    await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS get_member_assessment_history');
    await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS get_member_certificates');
    await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS get_member_learning_hours');
    await queryInterface.sequelize.query('DROP PROCEDURE IF EXISTS assign_assessment_to_user');
  }
};
