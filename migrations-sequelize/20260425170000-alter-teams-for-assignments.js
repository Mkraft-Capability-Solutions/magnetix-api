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

const SQL_PATH = path.join(__dirname, '..', 'migrations', 'alter_teams_for_assignments.sql');

module.exports = {
  async up({ context: queryInterface }) {
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    for (const stmt of splitSql(sql)) {
      await queryInterface.sequelize.query(stmt);
    }
  },
  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('ALTER TABLE teams DROP FOREIGN KEY fk_teams_organization');
    await queryInterface.sequelize.query('ALTER TABLE teams DROP FOREIGN KEY fk_teams_manager');
    await queryInterface.sequelize.query('ALTER TABLE teams DROP INDEX idx_teams_org');
    await queryInterface.sequelize.query('ALTER TABLE teams DROP INDEX idx_teams_manager');
    await queryInterface.sequelize.query('ALTER TABLE teams DROP COLUMN organization_id');
    await queryInterface.sequelize.query('ALTER TABLE teams DROP COLUMN manager_id');
  }
};
