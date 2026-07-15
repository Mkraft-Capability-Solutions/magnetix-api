'use strict';

/**
 * Per-organization feature access.
 *
 * Adds one table that lets a Super Admin switch individual platform
 * functionalities ON/OFF for a given organization. Org Admins (and all roles in
 * that org) then only see menu options for the allowed functionalities, and the
 * matching API routes are blocked server-side (see
 * src/middleware/org_feature_middleware.ts).
 *
 *   organization_features — override table. OPT-OUT model: a row with
 *                           is_enabled = 0 disables that functionality for the
 *                           org. Absence of a row (or is_enabled = 1) means the
 *                           functionality is enabled. New orgs therefore have
 *                           everything turned on until a Super Admin restricts.
 *
 * The catalog of gateable functionalities lives in code
 * (src/config/org_features_catalog.ts) — single source of truth shared by the
 * backend, the management API and the frontend — so this migration seeds no
 * rows; it only creates the storage.
 *
 * IDEMPOTENCE: CREATE TABLE IF NOT EXISTS, safe to re-run. Mirrors the
 * `organization_features` entry in src/config/ensure_schema.js (belt & braces).
 */

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`organization_features\` (
     \`organization_id\` INT NOT NULL,
     \`feature_key\`     VARCHAR(64) NOT NULL,
     \`is_enabled\`      TINYINT(1) NOT NULL DEFAULT 1,
     \`updated_by\`      VARCHAR(36) NULL,
     \`updated_at\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (\`organization_id\`, \`feature_key\`),
     INDEX \`idx_orgfeat_org\` (\`organization_id\`),
     INDEX \`idx_orgfeat_disabled\` (\`organization_id\`, \`is_enabled\`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
];

module.exports = {
  async up({ context: queryInterface }) {
    for (const sql of STATEMENTS) {
      await queryInterface.sequelize.query(sql);
    }
    console.log('  ✅ organization_features table ready');
  },

  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `organization_features`');
  }
};
