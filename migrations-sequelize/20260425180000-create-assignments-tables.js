'use strict';

const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '..', 'migrations', 'create_assignments_tables.sql');

module.exports = {
  async up({ context: queryInterface }) {
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    // Split by ; but keep it simple — there are no DELIMITER blocks in this file.
    const statements = sql
      .split(/;\s*\r?\n/)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.toUpperCase() !== 'USE LMS_DB');
    for (const stmt of statements) {
      // Skip plain SELECT status messages
      if (/^SELECT\s+'/i.test(stmt)) continue;
      await queryInterface.sequelize.query(stmt);
    }
  },
  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS assignment_email_log');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS assignment_submissions');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS assignments');
  }
};
