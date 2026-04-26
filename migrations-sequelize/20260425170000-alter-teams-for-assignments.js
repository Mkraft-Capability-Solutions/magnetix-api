'use strict';

const path = require('path');
const { runSqlFile } = require('./_lib/sql_runner');

const SQL_PATH = path.join(__dirname, '..', 'migrations', 'alter_teams_for_assignments.sql');

module.exports = {
  async up({ context: queryInterface }) {
    await runSqlFile(queryInterface, SQL_PATH);
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
