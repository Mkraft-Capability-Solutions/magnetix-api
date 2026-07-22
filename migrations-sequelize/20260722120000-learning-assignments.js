'use strict';

/**
 * Learning Assignment tool tables (Super Admin).
 *
 * Adds three new tables that back the "Learning Assignment Tool" — named,
 * trackable bundles of courses assigned to users. Purely additive: no existing
 * table, procedure or column is touched. The tables are ALSO created idempotently
 * on first use by learning_assignment_service.ensureTables(), so the feature
 * works whether or not this migration has run; both use the same DDL
 * (single source of truth in the service).
 */

const { TABLE_DDL } = require('../src/services/super_admin/learning_assignment_service');

async function apply(queryInterface) {
  for (const ddl of TABLE_DDL) {
    await queryInterface.sequelize.query(ddl);
  }
  console.log('  ✅ learning_assignment tables ensured');
}

module.exports = {
  async up({ context: queryInterface }) {
    await apply(queryInterface);
  },

  async down({ context: queryInterface }) {
    // Forward-only: dropping the tables would destroy assignment history, so the
    // down step is a no-op (the tables are harmless if unused).
    await apply(queryInterface);
  },
};
