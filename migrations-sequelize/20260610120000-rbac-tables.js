'use strict';

/**
 * Granular RBAC foundation.
 *
 * Adds four tables that let the super-admin define custom roles and grant them
 * fine-grained permissions, WITHOUT disturbing the four hardcoded role_ids
 * (1=student, 2=instructor, 3=admin, 4=super_admin) the rest of the app and the
 * frontend routing depend on.
 *
 *   roles                — 1-4 seeded as immutable system roles; custom roles
 *                          auto-increment from 100 so they never collide.
 *   permissions          — catalog of capability keys grouped by module.
 *   role_permissions     — many-to-many grant table.
 *   permission_audit_log — shared audit trail for RBAC changes, manager
 *                          reassignments and content lifecycle transitions.
 *
 * IDEMPOTENCE: every statement is `CREATE TABLE IF NOT EXISTS` or an
 * INSERT ... ON DUPLICATE KEY UPDATE / INSERT IGNORE, so re-running is a no-op.
 * We run each statement separately because sequelize.query executes a single
 * statement per call by default.
 */

const STATEMENTS = [
  // --- roles -------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS \`roles\` (
     \`id\`           INT PRIMARY KEY AUTO_INCREMENT,
     \`name\`         VARCHAR(64)  NOT NULL,
     \`label\`        VARCHAR(128) NOT NULL,
     \`description\`  VARCHAR(255) NULL,
     \`base_role_id\` INT NOT NULL DEFAULT 1,
     \`is_system\`    TINYINT(1) NOT NULL DEFAULT 0,
     \`is_active\`    TINYINT(1) NOT NULL DEFAULT 1,
     \`created_at\`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     \`updated_at\`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     UNIQUE KEY \`uq_roles_name\` (\`name\`),
     INDEX \`idx_roles_base\` (\`base_role_id\`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  // --- permissions -------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS \`permissions\` (
     \`id\`          INT PRIMARY KEY AUTO_INCREMENT,
     \`perm_key\`    VARCHAR(96) NOT NULL,
     \`module\`      VARCHAR(48) NOT NULL,
     \`label\`       VARCHAR(128) NOT NULL,
     \`description\` VARCHAR(255) NULL,
     \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY \`uq_perm_key\` (\`perm_key\`),
     INDEX \`idx_perm_module\` (\`module\`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  // --- role_permissions --------------------------------------------------
  `CREATE TABLE IF NOT EXISTS \`role_permissions\` (
     \`role_id\`       INT NOT NULL,
     \`permission_id\` INT NOT NULL,
     \`granted_by\`    VARCHAR(36) NULL,
     \`granted_at\`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (\`role_id\`, \`permission_id\`),
     INDEX \`idx_rp_role\` (\`role_id\`),
     INDEX \`idx_rp_perm\` (\`permission_id\`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  // --- permission_audit_log ---------------------------------------------
  `CREATE TABLE IF NOT EXISTS \`permission_audit_log\` (
     \`id\`          BIGINT PRIMARY KEY AUTO_INCREMENT,
     \`actor_uuid\`  VARCHAR(36) NOT NULL,
     \`action\`      VARCHAR(64) NOT NULL,
     \`target_type\` VARCHAR(32) NOT NULL,
     \`target_id\`   VARCHAR(64) NOT NULL,
     \`detail_json\` JSON NULL,
     \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX \`idx_audit_actor\` (\`actor_uuid\`),
     INDEX \`idx_audit_target\` (\`target_type\`, \`target_id\`),
     INDEX \`idx_audit_action\` (\`action\`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  // --- seed: 4 immutable system roles (explicit ids 1-4) -----------------
  `INSERT INTO \`roles\` (\`id\`, \`name\`, \`label\`, \`base_role_id\`, \`is_system\`) VALUES
     (1, 'student',     'Learner',       1, 1),
     (2, 'instructor',  'Trainer',       2, 1),
     (3, 'admin',       'Administrator', 3, 1),
     (4, 'super_admin', 'Super Admin',   4, 1)
   ON DUPLICATE KEY UPDATE \`label\` = VALUES(\`label\`), \`is_system\` = 1`,

  // Custom roles start at 100 so they never collide with the hardcoded 1-4.
  `ALTER TABLE \`roles\` AUTO_INCREMENT = 100`,

  // --- seed: permission catalog (~22 keys grouped by module) -------------
  `INSERT INTO \`permissions\` (\`perm_key\`, \`module\`, \`label\`) VALUES
     ('users.view',                 'users',    'View users'),
     ('users.create',               'users',    'Create users'),
     ('users.edit',                 'users',    'Edit users'),
     ('users.deactivate',           'users',    'Deactivate users'),
     ('users.hierarchy.view',       'users',    'View org hierarchy'),
     ('users.hierarchy.manage',     'users',    'Reassign reporting lines'),
     ('content.taxonomy.view',      'content',  'View content taxonomy'),
     ('content.taxonomy.manage',    'content',  'Manage categories & subcategories'),
     ('content.course.view',        'content',  'View course structure'),
     ('content.course.edit',        'content',  'Edit course structure'),
     ('content.lifecycle.submit',   'content',  'Submit course for review'),
     ('content.lifecycle.approve',  'content',  'Approve course'),
     ('content.lifecycle.publish',  'content',  'Publish course'),
     ('content.lifecycle.archive',  'content',  'Archive course'),
     ('org.view',                   'org',      'View organizations'),
     ('org.manage',                 'org',      'Manage organizations'),
     ('org.users.assign',          'org',      'Assign users to organizations'),
     ('security.roles.view',        'security', 'View roles & permissions'),
     ('security.roles.manage',      'security', 'Create & edit roles'),
     ('security.permissions.assign','security', 'Assign permissions & roles'),
     ('reports.view',               'reports',  'View reports'),
     ('reports.export',             'reports',  'Export reports')
   ON DUPLICATE KEY UPDATE \`label\` = VALUES(\`label\`), \`module\` = VALUES(\`module\`)`,

  // --- seed: grant role 3 (admin) the read-only "*.view" keys as a sane
  //     default starting point. Role 4 (super admin) needs no rows — it
  //     bypasses requirePermission entirely. Idempotent via INSERT IGNORE.
  `INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
     SELECT 3, p.id FROM \`permissions\` p WHERE p.perm_key LIKE '%.view'`
];

module.exports = {
  async up({ context: queryInterface }) {
    for (const sql of STATEMENTS) {
      await queryInterface.sequelize.query(sql);
    }
    console.log('  ✅ RBAC tables (roles, permissions, role_permissions, permission_audit_log) ready');
  },

  async down({ context: queryInterface }) {
    // Drop in dependency-safe order (no FKs declared, but be tidy).
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `role_permissions`');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `permission_audit_log`');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `permissions`');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `roles`');
  }
};
