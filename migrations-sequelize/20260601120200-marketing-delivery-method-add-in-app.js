'use strict';

/**
 * Add 'in-app' to marketing_campaigns.delivery_method ENUM.
 *
 * The compose UI sends delivery_method values of 'email' | 'in-app' | 'both',
 * but the column was ENUM('email','notification','both') — so an in-app
 * campaign stored an empty/invalid value, and the admin send path (which gates
 * in-app on deliveryMethod === 'in-app' || 'both') would then skip the in-app
 * notification. Widening the ENUM lets the real value persist.
 *
 * 'notification' is kept for backward compatibility with any existing rows.
 *
 * IDEMPOTENT: probes COLUMN_TYPE first and skips when 'in-app' is already
 * present (e.g. fresh installs where marketing_setup.sql already has it), and
 * no-ops when the table doesn't exist yet.
 */

async function tableExists(queryInterface, table) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS n
       FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = :table`,
    { replacements: { table } }
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  return Number(row?.n || 0) > 0;
}

async function enumHasValue(queryInterface, table, column, value) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COLUMN_TYPE AS t
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = :table
        AND column_name = :column`,
    { replacements: { table, column } }
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  return !!(row && typeof row.t === 'string' && row.t.includes(`'${value}'`));
}

module.exports = {
  async up({ context: queryInterface }) {
    if (!(await tableExists(queryInterface, 'marketing_campaigns'))) {
      console.log('  ⓘ marketing_campaigns not present yet — skipping delivery_method ENUM update');
      return;
    }
    if (await enumHasValue(queryInterface, 'marketing_campaigns', 'delivery_method', 'in-app')) {
      console.log('  ⓘ delivery_method already includes in-app — skipping');
      return;
    }
    await queryInterface.sequelize.query(
      `ALTER TABLE marketing_campaigns
         MODIFY COLUMN delivery_method
         ENUM('email', 'notification', 'in-app', 'both') DEFAULT 'notification'`
    );
    console.log("  ✅ marketing_campaigns.delivery_method now includes 'in-app'");
  },

  async down() {
    // No-op: narrowing the ENUM back could orphan rows already storing 'in-app'.
  }
};
