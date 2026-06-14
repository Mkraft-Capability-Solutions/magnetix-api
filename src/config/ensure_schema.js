/**
 * Boot-time schema integrity check.
 *
 * Runs AFTER umzug.up() and INDEPENDENT of SequelizeMeta state. For every
 * critical table the app expects, verify it exists; if not, create it on the
 * spot via the same `promisePool` the rest of the app uses for runtime queries.
 *
 * Why we need this:
 *   The umzug + Sequelize migration runner has, on at least one machine,
 *   silently marked migrations as applied without actually executing their
 *   `up()` body. We never reproduced the exact cause and chasing it further
 *   isn't worth the time. This module is the safety net: even if `SequelizeMeta`
 *   is in a wrong state, the schema is what the app actually queries — verify
 *   it directly.
 *
 * How to add a table:
 *   Append to `EXPECTED_TABLES` below, in dependency order (FK referenced
 *   tables first). Each entry is `{ name, createSql }`. Use IF NOT EXISTS in
 *   the SQL — the check runs every boot and must be idempotent.
 */

const { promisePool } = require('./db');

const EXPECTED_TABLES = [
  // NOTE: We deliberately omit FOREIGN KEY constraints from these tables.
  // MySQL FK creation is fragile across charset/collation/engine drift between
  // parent and child columns, and on this DB the parent tables (`teams`,
  // `users`, `feedback_forms`, etc.) were created out-of-band with assorted
  // historical settings. Trying to declare FKs here throws ER_FK_CANNOT_OPEN_PARENT.
  // Referential integrity is enforced at the service layer (see
  // `src/services/assignment_service.js`), and we keep an INDEX on every
  // would-be-FK column for query performance.
  {
    name: 'assignments',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`assignments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT,
        \`type\` ENUM('document','assessment') NOT NULL,
        \`assessment_id\` INT NULL,
        \`doc_instructions\` TEXT NULL,
        \`allow_resubmission\` TINYINT(1) DEFAULT 0,
        \`max_file_size_mb\` INT DEFAULT 25,
        \`allowed_file_types\` VARCHAR(255) DEFAULT 'pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,png',
        \`scope\` ENUM('organization','team') NOT NULL,
        \`organization_id\` INT NULL,
        \`team_id\` INT NULL,
        \`start_date\` DATETIME NOT NULL,
        \`end_date\` DATETIME NOT NULL,
        \`created_by\` VARCHAR(36) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        INDEX \`idx_assignments_assessment\` (\`assessment_id\`),
        INDEX \`idx_assignments_team\`   (\`team_id\`, \`end_date\`),
        INDEX \`idx_assignments_org\`    (\`organization_id\`, \`end_date\`),
        INDEX \`idx_assignments_window\` (\`start_date\`, \`end_date\`),
        INDEX \`idx_assignments_creator\` (\`created_by\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'assignment_submissions',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`assignment_submissions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`assignment_id\` INT NOT NULL,
        \`user_id\` VARCHAR(36) NOT NULL,
        \`submission_type\` ENUM('document','assessment') NOT NULL,
        \`file_url\` VARCHAR(500) NULL,
        \`file_name\` VARCHAR(255) NULL,
        \`file_size_bytes\` BIGINT NULL,
        \`assessment_response_id\` INT NULL,
        \`notes\` TEXT NULL,
        \`status\` ENUM('submitted','reviewed','rejected') DEFAULT 'submitted',
        \`reviewed_by\` VARCHAR(36) NULL,
        \`reviewed_at\` TIMESTAMP NULL,
        \`feedback\` TEXT NULL,
        \`submitted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uniq_submission_assignment_user\` (\`assignment_id\`, \`user_id\`),
        INDEX \`idx_submission_user\` (\`user_id\`, \`submitted_at\`),
        INDEX \`idx_submission_assignment_status\` (\`assignment_id\`, \`status\`, \`submitted_at\`),
        INDEX \`idx_submission_response\` (\`assessment_response_id\`),
        INDEX \`idx_submission_reviewer\` (\`reviewed_by\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'assignment_email_log',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`assignment_email_log\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`assignment_id\` INT NOT NULL,
        \`user_id\` VARCHAR(36) NOT NULL,
        \`email_type\` ENUM(
          'created','reminder_48h','reminder_24h','missed_learner',
          'missed_escalation','submission_confirm','submission_received',
          'review_completed','manager_assigned'
        ) NOT NULL,
        \`sent_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`message_id\` VARCHAR(255) NULL,
        UNIQUE KEY \`uniq_email\` (\`assignment_id\`, \`user_id\`, \`email_type\`),
        INDEX \`idx_log_assignment\` (\`assignment_id\`),
        INDEX \`idx_log_user\` (\`user_id\`, \`email_type\`, \`sent_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  // --- Granular RBAC (see migrations-sequelize/20260610120000-rbac-tables.js).
  // Self-heal table existence here; the seed rows (4 system roles + permission
  // catalog) live in the migration, which runs first at boot.
  {
    name: 'roles',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`roles\` (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'permissions',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`permissions\` (
        \`id\`          INT PRIMARY KEY AUTO_INCREMENT,
        \`perm_key\`    VARCHAR(96) NOT NULL,
        \`module\`      VARCHAR(48) NOT NULL,
        \`label\`       VARCHAR(128) NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_perm_key\` (\`perm_key\`),
        INDEX \`idx_perm_module\` (\`module\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'role_permissions',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`role_permissions\` (
        \`role_id\`       INT NOT NULL,
        \`permission_id\` INT NOT NULL,
        \`granted_by\`    VARCHAR(36) NULL,
        \`granted_at\`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`role_id\`, \`permission_id\`),
        INDEX \`idx_rp_role\` (\`role_id\`),
        INDEX \`idx_rp_perm\` (\`permission_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'permission_audit_log',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`permission_audit_log\` (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  // --- Content governance lifecycle history
  // (see migrations-sequelize/20260610120100-content-governance.js).
  {
    name: 'course_lifecycle_history',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`course_lifecycle_history\` (
        \`id\`          BIGINT PRIMARY KEY AUTO_INCREMENT,
        \`course_id\`   INT NOT NULL,
        \`from_status\` ENUM('draft','pending','published','archived') NULL,
        \`to_status\`   ENUM('draft','pending','published','archived') NOT NULL,
        \`actor_uuid\`  VARCHAR(36) NOT NULL,
        \`note\`        VARCHAR(500) NULL,
        \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_clh_course\` (\`course_id\`),
        INDEX \`idx_clh_status\` (\`to_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'course_approval_requests',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`course_approval_requests\` (
        \`id\`                BIGINT PRIMARY KEY AUTO_INCREMENT,
        \`course_id\`         INT NOT NULL,
        \`requires_approval\` TINYINT(1) NOT NULL DEFAULT 1,
        \`approver_type\`     ENUM('user','email') NOT NULL,
        \`approver_uuid\`     VARCHAR(36) NULL,
        \`approver_email\`    VARCHAR(255) NULL,
        \`status\`            ENUM('pending','approved','rejected','notified') NOT NULL DEFAULT 'pending',
        \`requested_by\`      VARCHAR(36) NULL,
        \`note\`              VARCHAR(500) NULL,
        \`requested_at\`      TIMESTAMP NULL,
        \`decided_at\`        TIMESTAMP NULL,
        \`created_at\`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_car_course\` (\`course_id\`),
        INDEX \`idx_car_approver\` (\`approver_uuid\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  }
];

/**
 * Columns we add via ALTER TABLE on existing tables. Each entry is idempotent —
 * the runner checks information_schema first and only ALTERs when missing.
 *
 * Why: many tables in this DB predate the app and live in MySQL with assorted
 * legacy charsets/engines. A full CREATE TABLE re-run isn't safe. But we can
 * still safely ADD COLUMN IF MISSING for new feature columns.
 */
const EXPECTED_COLUMNS = [
  {
    table: 'users',
    column: 'reports_to_uuid',
    addSql: `ALTER TABLE \`users\`
              ADD COLUMN \`reports_to_uuid\` VARCHAR(36) NULL,
              ADD INDEX \`idx_users_reports_to\` (\`reports_to_uuid\`)`
  },
  // Content governance: who submitted a course for review / who approved it.
  // (see migrations-sequelize/20260610120100-content-governance.js)
  {
    table: 'course',
    column: 'submitted_by',
    addSql: `ALTER TABLE \`course\` ADD COLUMN \`submitted_by\` VARCHAR(36) NULL`
  },
  {
    table: 'course',
    column: 'reviewed_by',
    addSql: `ALTER TABLE \`course\` ADD COLUMN \`reviewed_by\` VARCHAR(36) NULL`
  }
];

async function tableExists(name) {
  const [rows] = await promisePool.query(
    `SELECT COUNT(*) AS n
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?`,
    [name]
  );
  return rows[0].n > 0;
}

async function columnExists(table, column) {
  const [rows] = await promisePool.query(
    `SELECT COUNT(*) AS n
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?`,
    [table, column]
  );
  return rows[0].n > 0;
}

async function ensureSchema() {
  console.log('🔍 ensureSchema: verifying critical tables exist...');
  let createdCount = 0;
  let alreadyOkCount = 0;

  for (const { name, createSql } of EXPECTED_TABLES) {
    const exists = await tableExists(name);
    if (exists) {
      alreadyOkCount++;
      continue;
    }
    console.log(`  ⚠ Missing table \`${name}\` — creating now...`);
    try {
      await promisePool.query(createSql);
    } catch (err) {
      console.error(`  ❌ Failed to create \`${name}\`:`, err.message);
      throw err;
    }
    const verified = await tableExists(name);
    if (!verified) {
      throw new Error(
        `ensureSchema: created \`${name}\` but post-create verification still shows it missing — DDL succeeded but table not found in DATABASE() scope`
      );
    }
    console.log(`  ✅ Created \`${name}\``);
    createdCount++;
  }

  console.log(
    `🔍 ensureSchema: ${alreadyOkCount} table(s) already present, ${createdCount} table(s) just created`
  );

  // Column-level self-heal for evolutions on existing tables.
  let columnsAdded = 0;
  let columnsAlreadyOk = 0;
  const columnsStillMissing = [];
  for (const { table, column, addSql } of EXPECTED_COLUMNS) {
    const tblOk = await tableExists(table);
    if (!tblOk) {
      // Parent table missing — skip; nothing we can ALTER here.
      columnsStillMissing.push(`${table}.${column} (parent table missing)`);
      continue;
    }
    const colOk = await columnExists(table, column);
    if (colOk) {
      columnsAlreadyOk++;
      continue;
    }
    console.log(`  ⚠ Missing column \`${table}.${column}\` — adding now...`);
    try {
      await promisePool.query(addSql);
      columnsAdded++;
      console.log(`  ✅ Added \`${table}.${column}\``);
    } catch (err) {
      // Don't throw — a missing column is a feature degradation, not a fatal
      // boot failure. Log and continue so the rest of the app comes up.
      console.error(`  ❌ Failed to add \`${table}.${column}\`:`, err.message);
      const verifiedAfter = await columnExists(table, column).catch(() => false);
      if (!verifiedAfter) columnsStillMissing.push(`${table}.${column}`);
    }
  }
  if (EXPECTED_COLUMNS.length > 0) {
    console.log(
      `🔍 ensureSchema: ${columnsAlreadyOk} column(s) already present, ${columnsAdded} column(s) just added`
    );
  }
  if (columnsStillMissing.length > 0) {
    console.warn(
      `⚠ Schema gap: the following columns are still missing after ensureSchema — ` +
        `dependent features will degrade gracefully but should be remediated:\n   - ` +
        columnsStillMissing.join('\n   - ')
    );
  }
}

module.exports = { ensureSchema, EXPECTED_TABLES, EXPECTED_COLUMNS };
