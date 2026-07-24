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
const { PROCEDURES } = require('./procedures_catalog');

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
  // --- Per-org feature access (see migrations-sequelize/20260617120000-org-features.js
  // and src/config/org_features_catalog.ts). OPT-OUT model: a row with
  // is_enabled = 0 disables that functionality for the org; absence = enabled.
  {
    name: 'organization_features',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`organization_features\` (
        \`organization_id\` INT NOT NULL,
        \`feature_key\`     VARCHAR(64) NOT NULL,
        \`is_enabled\`      TINYINT(1) NOT NULL DEFAULT 1,
        \`updated_by\`      VARCHAR(36) NULL,
        \`updated_at\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`organization_id\`, \`feature_key\`),
        INDEX \`idx_orgfeat_org\` (\`organization_id\`),
        INDEX \`idx_orgfeat_disabled\` (\`organization_id\`, \`is_enabled\`)
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
  },
  // --- Byte Video generation jobs + results
  // (see migrations-sequelize/20260622120000-byte-videos.js and
  //  20260625120000-byte-videos-voice.js). `voice_id` is inlined here so the
  //  full table self-heals in one shot even if the migrations were skipped —
  //  this is the table whose absence broke Byte Video in prod.
  {
    name: 'byte_videos',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`byte_videos\` (
        \`id\`                  BIGINT PRIMARY KEY AUTO_INCREMENT,
        \`created_by\`          VARCHAR(36) NOT NULL,
        \`creator_role\`        VARCHAR(32) NOT NULL,
        \`command\`             TEXT NOT NULL,
        \`title\`               VARCHAR(255) NULL,
        \`status\`              ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
        \`provider\`            VARCHAR(32) NOT NULL DEFAULT 'explainer',
        \`voice_id\`            VARCHAR(64) NULL,
        \`script_json\`         JSON NULL,
        \`output_filename\`     VARCHAR(255) NULL,
        \`thumbnail_filename\`  VARCHAR(255) NULL,
        \`duration_seconds\`    INT NULL,
        \`error_message\`       TEXT NULL,
        \`created_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_byte_videos_owner\` (\`created_by\`, \`status\`),
        INDEX \`idx_byte_videos_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  // ---- Knowledge Base ----
  // These tables were historically created out-of-band (not in any migration).
  // Self-heal them so fresh/prod DBs get them (and the audience_roles column)
  // without a manual step. IF NOT EXISTS makes this a no-op on existing installs.
  {
    name: 'kb_entries',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`kb_entries\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`version\` VARCHAR(50) NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`published_date\` DATE NULL,
        \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
        \`audience_roles\` VARCHAR(50) NULL,
        \`created_by\` CHAR(36) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        INDEX \`idx_kb_entries_status\` (\`status\`),
        INDEX \`idx_kb_entries_date\` (\`published_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'kb_entry_items',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`kb_entry_items\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`kb_entry_id\` INT UNSIGNED NOT NULL,
        \`type\` VARCHAR(30) NOT NULL DEFAULT 'feature',
        \`description\` TEXT NULL,
        \`sort_order\` INT UNSIGNED DEFAULT 0,
        INDEX \`idx_kb_entry_items_entry\` (\`kb_entry_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'kb_faqs',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`kb_faqs\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`question\` VARCHAR(500) NOT NULL,
        \`answer\` TEXT NOT NULL,
        \`category\` VARCHAR(100) DEFAULT 'General',
        \`sort_order\` INT UNSIGNED DEFAULT 0,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`audience_roles\` VARCHAR(50) NULL,
        \`created_by\` CHAR(36) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        INDEX \`idx_kb_faqs_active\` (\`is_active\`),
        INDEX \`idx_kb_faqs_category\` (\`category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `
  },
  {
    name: 'kb_articles',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`kb_articles\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`title\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NULL,
        \`content\` TEXT NULL,
        \`excerpt\` VARCHAR(500) NULL,
        \`category\` VARCHAR(100) DEFAULT 'General',
        \`tags\` VARCHAR(500) NULL,
        \`cover_image\` VARCHAR(500) NULL,
        \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
        \`sort_order\` INT UNSIGNED DEFAULT 0,
        \`audience_roles\` VARCHAR(50) NULL,
        \`created_by\` CHAR(36) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        INDEX \`idx_kb_articles_status\` (\`status\`),
        INDEX \`idx_kb_articles_category\` (\`category\`),
        INDEX \`idx_kb_articles_slug\` (\`slug\`)
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
  },
  // Byte Video: chosen narration voice. Heals the case where `byte_videos`
  // pre-existed (from the first migration) but the voice migration was skipped.
  // (see migrations-sequelize/20260625120000-byte-videos-voice.js)
  {
    table: 'byte_videos',
    column: 'voice_id',
    addSql: `ALTER TABLE \`byte_videos\` ADD COLUMN \`voice_id\` VARCHAR(64) NULL AFTER \`provider\``
  },
  // course_lesson: columns the 17-param add_course_lesson procedure reads/writes.
  // Missing any of these breaks all lesson adds (normal + "Add from Library").
  // (see migrations-sequelize/20260709130000-fix-add-course-lesson-assessment-params.js)
  { table: 'course_lesson', column: 'lesson_order',                addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`lesson_order\` INT DEFAULT 0` },
  { table: 'course_lesson', column: 'lesson_content_type',         addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`lesson_content_type\` VARCHAR(50) NULL` },
  { table: 'course_lesson', column: 'lesson_content_document',     addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`lesson_content_document\` VARCHAR(500) NULL` },
  { table: 'course_lesson', column: 'lesson_content_scorm',        addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`lesson_content_scorm\` VARCHAR(500) NULL` },
  { table: 'course_lesson', column: 'lesson_content_mp4',          addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`lesson_content_mp4\` VARCHAR(500) NULL` },
  { table: 'course_lesson', column: 'lesson_content_url',          addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`lesson_content_url\` VARCHAR(1000) NULL` },
  { table: 'course_lesson', column: 'lesson_duration',             addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`lesson_duration\` VARCHAR(100) NULL` },
  { table: 'course_lesson', column: 'creator_id',                  addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`creator_id\` VARCHAR(36) NULL` },
  { table: 'course_lesson', column: 'last_updated_by',             addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`last_updated_by\` VARCHAR(36) NULL` },
  { table: 'course_lesson', column: 'is_deleted',                  addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`is_deleted\` TINYINT(1) DEFAULT 0` },
  { table: 'course_lesson', column: 'assessment_id',               addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`assessment_id\` INT NULL DEFAULT NULL` },
  { table: 'course_lesson', column: 'require_section_completion',  addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`require_section_completion\` TINYINT(1) DEFAULT 0` },
  { table: 'course_lesson', column: 'assessment_start_date',       addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`assessment_start_date\` DATE NULL DEFAULT NULL` },
  { table: 'course_lesson', column: 'assessment_end_date',         addSql: `ALTER TABLE \`course_lesson\` ADD COLUMN \`assessment_end_date\` DATE NULL DEFAULT NULL` },
  // Optional per-enrolment due date, written by sp_bulk_enroll_users ("Assign
  // Training" on My Team). NULL for enrolments created without a deadline.
  { table: 'enrol',         column: 'deadline',                    addSql: `ALTER TABLE \`enrol\` ADD COLUMN \`deadline\` DATE NULL DEFAULT NULL` },
  // Knowledge Base audience targeting: NULL/'' = Public (anyone, incl. logged
  // out); otherwise a CSV of role ids (1=Learner,2=Trainer,3=Admin,4=SuperAdmin)
  // restricting the entry to those roles. Heals existing installs where the kb_*
  // tables pre-existed the audience feature.
  { table: 'kb_articles',   column: 'audience_roles',              addSql: `ALTER TABLE \`kb_articles\` ADD COLUMN \`audience_roles\` VARCHAR(50) NULL` },
  { table: 'kb_entries',    column: 'audience_roles',              addSql: `ALTER TABLE \`kb_entries\` ADD COLUMN \`audience_roles\` VARCHAR(50) NULL` },
  { table: 'kb_faqs',       column: 'audience_roles',              addSql: `ALTER TABLE \`kb_faqs\` ADD COLUMN \`audience_roles\` VARCHAR(50) NULL` }
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

/**
 * Return the stored body (BEGIN…END) of a procedure, or null if it doesn't
 * exist. ROUTINE_DEFINITION does not include the parameter list, so `marker`
 * substrings must be chosen from the body (see procedures_catalog.js).
 */
async function procedureBody(name) {
  const [rows] = await promisePool.query(
    `SELECT ROUTINE_DEFINITION AS def
       FROM information_schema.routines
      WHERE routine_schema = DATABASE()
        AND routine_type = 'PROCEDURE'
        AND routine_name = ?`,
    [name]
  );
  if (!rows || rows.length === 0) return null;
  return rows[0].def || '';
}

/**
 * Boot-time stored-procedure self-heal. Independent of SequelizeMeta, exactly
 * like ensureSchema(). For each procedure in the catalog: if it's missing, or
 * present but STALE (its body lacks the marker that only the correct version
 * contains), DROP + CREATE it from the canonical definition. Otherwise leave it
 * untouched — no needless churn, and no DROP/CREATE race in the common case.
 *
 * Must run AFTER ensureSchema() so columns the procedures depend on
 * (e.g. course_lesson.assessment_end_date) already exist.
 */
async function ensureProcedures() {
  console.log('🔍 ensureProcedures: verifying critical stored procedures...');
  let upToDate = 0;
  let reconciled = 0;
  const stillBroken = [];

  for (const { name, marker, create } of PROCEDURES) {
    let body;
    try {
      body = await procedureBody(name);
    } catch (err) {
      console.error(`  ❌ Could not introspect procedure \`${name}\`:`, err.message);
      stillBroken.push(name);
      continue;
    }

    const present = body !== null;
    const current = present && (!marker || body.includes(marker));
    if (current) {
      upToDate++;
      continue;
    }

    console.log(`  ⚠ Procedure \`${name}\` is ${present ? 'stale' : 'missing'} — (re)creating...`);
    try {
      await promisePool.query(`DROP PROCEDURE IF EXISTS \`${name}\``);
      await promisePool.query(create);
      reconciled++;
      console.log(`  ✅ \`${name}\` reconciled`);
    } catch (err) {
      // Non-fatal: a broken procedure degrades a feature but shouldn't block
      // boot. Surface it loudly so it gets remediated.
      console.error(`  ❌ Failed to (re)create \`${name}\`:`, err.message);
      stillBroken.push(name);
    }
  }

  console.log(
    `🔍 ensureProcedures: ${upToDate} up-to-date, ${reconciled} reconciled`
  );
  if (stillBroken.length > 0) {
    console.warn(
      `⚠ Schema gap: the following procedures are still broken after ensureProcedures — ` +
        `dependent features will fail until remediated: ${stillBroken.join(', ')}`
    );
  }
}

module.exports = { ensureSchema, ensureProcedures, EXPECTED_TABLES, EXPECTED_COLUMNS };
