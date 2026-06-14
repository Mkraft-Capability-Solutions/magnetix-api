'use strict';

const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '..', 'src', 'sql', 'client_error_log.sql');

module.exports = {
  async up({ context: queryInterface }) {
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    // Single CREATE TABLE IF NOT EXISTS — no DELIMITER tricks needed.
    await queryInterface.sequelize.query(sql);
  },
  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS client_error_log');
  }
};
