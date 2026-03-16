const { promisePool } = require('../../config/db');

class LearningItemService {

  // ─── auto-migrate: create tables if they don't exist ──────────────────────

  async ensureTablesExist() {
    const conn = await promisePool.getConnection();
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`learning_item_instances\` (
          \`id\`              INT          AUTO_INCREMENT PRIMARY KEY,
          \`title\`           VARCHAR(255) NOT NULL,
          \`description\`     TEXT,
          \`item_type\`       ENUM('course','quiz') NOT NULL,
          \`source_id\`       INT          NOT NULL,
          \`source_title\`    VARCHAR(255) NOT NULL,
          \`assigned_to_all\` TINYINT(1)   NOT NULL DEFAULT 0,
          \`start_date\`      DATE         DEFAULT NULL,
          \`deadline\`        DATE         DEFAULT NULL,
          \`max_attempts\`    INT          DEFAULT NULL,
          \`passing_score\`   DECIMAL(5,2) DEFAULT NULL,
          \`status\`          ENUM('draft','active','closed','expired') NOT NULL DEFAULT 'draft',
          \`created_by\`      VARCHAR(36)  NOT NULL,
          \`created_at\`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_lii_type_source\`  (\`item_type\`, \`source_id\`),
          INDEX \`idx_lii_status\`       (\`status\`),
          INDEX \`idx_lii_deadline\`     (\`deadline\`),
          INDEX \`idx_lii_created_by\`   (\`created_by\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      // Fix collation if table was previously created with wrong collation
      await conn.query(`ALTER TABLE \`learning_item_instances\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`learning_item_instance_batches\` (
          \`id\`          INT AUTO_INCREMENT PRIMARY KEY,
          \`instance_id\` INT NOT NULL,
          \`batch_id\`    INT NOT NULL,
          \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (\`instance_id\`) REFERENCES \`learning_item_instances\`(\`id\`) ON DELETE CASCADE,
          UNIQUE KEY \`uk_liib_instance_batch\` (\`instance_id\`, \`batch_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      await conn.query(`ALTER TABLE \`learning_item_instance_batches\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`learning_item_progress\` (
          \`id\`           INT AUTO_INCREMENT PRIMARY KEY,
          \`instance_id\`  INT          NOT NULL,
          \`user_id\`      VARCHAR(36)  NOT NULL,
          \`attempts\`     INT          NOT NULL DEFAULT 0,
          \`score\`        DECIMAL(5,2) DEFAULT NULL,
          \`status\`       ENUM('not_started','in_progress','completed','passed','failed') NOT NULL DEFAULT 'not_started',
          \`started_at\`   TIMESTAMP    NULL,
          \`completed_at\` TIMESTAMP    NULL,
          \`created_at\`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (\`instance_id\`) REFERENCES \`learning_item_instances\`(\`id\`) ON DELETE CASCADE,
          UNIQUE KEY \`uk_lip_instance_user\` (\`instance_id\`, \`user_id\`),
          INDEX \`idx_lip_user_id\` (\`user_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      await conn.query(`ALTER TABLE \`learning_item_progress\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);

      console.log('✅ Learning item tables verified/created');
    } catch (err) {
      console.error('❌ Failed to ensure learning item tables:', err.message);
    } finally {
      conn.release();
    }
  }

  // Check whether feedback_forms has assessment_type column
  async _hasAssessmentTypeCol() {
    const [[row]] = await promisePool.query(`
      SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME   = 'feedback_forms'
         AND COLUMN_NAME  = 'assessment_type'
    `);
    return row.cnt > 0;
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  async _expireStaleInstances() {
    try {
      await promisePool.query(`
        UPDATE learning_item_instances
           SET status = 'expired'
         WHERE status = 'active'
           AND deadline IS NOT NULL
           AND deadline < CURDATE()
      `);
    } catch (_) {
      // Table may not exist yet — ignore
    }
  }

  // ─── catalogue ────────────────────────────────────────────────────────────

  async getCourses() {
    // Count active instances only if the table already exists
    const [[{ tbl }]] = await promisePool.query(`
      SELECT COUNT(*) AS tbl
        FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_NAME = 'learning_item_instances'
    `);

    const instanceSubquery = tbl > 0
      ? `(SELECT COUNT(*) FROM learning_item_instances lii
            WHERE lii.item_type = 'course' AND lii.source_id = c.id
              AND lii.status NOT IN ('expired','closed'))`
      : `0`;

    const [rows] = await promisePool.query(`
      SELECT c.id,
             c.title,
             c.short_description            AS description,
             c.level,
             c.course_duration              AS duration,
             c.thumbnail,
             c.status,
             COALESCE(
               CONCAT(i.first_name, ' ', i.last_name),
               'Unknown'
             )                              AS instructor,
             (SELECT COUNT(*) FROM course_section cs WHERE cs.course_id = c.id)  AS sectionCount,
             (SELECT COUNT(*) FROM course_lesson  cl WHERE cl.course_id = c.id)  AS lessonCount,
             ${instanceSubquery}            AS activeInstances
        FROM course c
   LEFT JOIN instructors i ON i.user_id = c.creator_id
       WHERE c.is_deleted = 0
         AND c.status != 'inactive'
    ORDER BY c.last_updated DESC
    `);
    return rows;
  }

  async getQuizzes() {
    const hasAssessmentType = await this._hasAssessmentTypeCol();

    const [[{ tbl }]] = await promisePool.query(`
      SELECT COUNT(*) AS tbl
        FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_NAME = 'learning_item_instances'
    `);

    const instanceSubquery = tbl > 0
      ? `(SELECT COUNT(*) FROM learning_item_instances lii
            WHERE lii.item_type = 'quiz' AND lii.source_id = f.id
              AND lii.status NOT IN ('expired','closed'))`
      : `0`;

    const assessmentTypeCol = hasAssessmentType
      ? `f.assessment_type AS assessmentType,`
      : `NULL AS assessmentType,`;

    const [rows] = await promisePool.query(`
      SELECT f.id,
             f.name                         AS title,
             f.description,
             ${assessmentTypeCol}
             f.status,
             f.created_at,
             COALESCE(
               CONCAT(i.first_name, ' ', i.last_name),
               s.first_name,
               'Admin'
             )                              AS createdBy,
             (SELECT COUNT(*) FROM feedback_questions fq WHERE fq.form_id = f.id) AS questionCount,
             ${instanceSubquery}            AS activeInstances
        FROM feedback_forms f
   LEFT JOIN instructors i ON i.user_id = f.created_by
   LEFT JOIN students    s ON s.user_id = f.created_by
       WHERE f.type = 'assessment'
         AND f.status != 'closed'
         AND (f.is_deleted IS NULL OR f.is_deleted = 0)
    ORDER BY f.created_at DESC
    `);
    return rows;
  }

  // ─── instances CRUD ───────────────────────────────────────────────────────

  async createInstance(userId, data) {
    const {
      title,
      description,
      itemType,
      sourceId,
      sourceTitle,
      assignedToAll,
      batchIds,
      startDate,
      deadline,
      maxAttempts,
      passingScore,
      status,
    } = data;

    if (startDate && deadline && new Date(deadline) <= new Date(startDate)) {
      throw new Error('VALIDATION_ERROR: Deadline must be after the start date');
    }
    if (status === 'active' && deadline && new Date(deadline) < new Date()) {
      throw new Error('VALIDATION_ERROR: Deadline cannot be in the past for an active instance');
    }

    const conn = await promisePool.getConnection();
    await conn.beginTransaction();
    try {
      const [result] = await conn.query(
        `INSERT INTO learning_item_instances
           (title, description, item_type, source_id, source_title,
            assigned_to_all, start_date, deadline, max_attempts, passing_score, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title.trim(),
          description?.trim() || null,
          itemType,
          sourceId,
          sourceTitle.trim(),
          assignedToAll ? 1 : 0,
          startDate || null,
          deadline || null,
          maxAttempts || null,
          passingScore || null,
          status || 'draft',
          userId,
        ]
      );
      const instanceId = result.insertId;

      if (!assignedToAll && batchIds && batchIds.length > 0) {
        const batchValues = batchIds.map(bid => [instanceId, bid]);
        await conn.query(
          'INSERT IGNORE INTO learning_item_instance_batches (instance_id, batch_id) VALUES ?',
          [batchValues]
        );
      }

      await conn.commit();
      return { id: instanceId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getInstances({ itemType, status, page = 1, limit = 20 } = {}) {
    await this.ensureTablesExist();
    await this._expireStaleInstances();

    const conditions = [];
    const params = [];

    if (itemType) { conditions.push('lii.item_type = ?'); params.push(itemType); }
    if (status)   { conditions.push('lii.status = ?');    params.push(status);   }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [rows] = await promisePool.query(
      `SELECT lii.*,
              COALESCE(
                CONCAT(i.first_name, ' ', i.last_name),
                s.first_name,
                'Admin'
              )                              AS createdByName,
              (SELECT COUNT(*) FROM learning_item_instance_batches liib
                WHERE liib.instance_id = lii.id)       AS batchCount,
              (SELECT COUNT(*) FROM learning_item_progress lip
                WHERE lip.instance_id = lii.id)         AS enrolledCount,
              (SELECT COUNT(*) FROM learning_item_progress lip
                WHERE lip.instance_id = lii.id
                  AND lip.status IN ('completed','passed')) AS completedCount
         FROM learning_item_instances lii
    LEFT JOIN instructors i ON i.user_id = lii.created_by
    LEFT JOIN students    s ON s.user_id = lii.created_by
       ${where}
     ORDER BY lii.created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await promisePool.query(
      `SELECT COUNT(*) AS total FROM learning_item_instances lii ${where}`,
      params
    );

    return { instances: rows, total, page, limit };
  }

  async getInstanceById(id) {
    await this._expireStaleInstances();

    const [[instance]] = await promisePool.query(
      `SELECT lii.*,
              COALESCE(
                CONCAT(i.first_name, ' ', i.last_name),
                s.first_name,
                'Admin'
              ) AS createdByName
         FROM learning_item_instances lii
    LEFT JOIN instructors i ON i.user_id = lii.created_by
    LEFT JOIN students    s ON s.user_id = lii.created_by
        WHERE lii.id = ?`,
      [id]
    );
    if (!instance) return null;

    const [batches] = await promisePool.query(
      `SELECT b.id, b.batch_name AS name
         FROM learning_item_instance_batches liib
         JOIN batches b ON b.id = liib.batch_id
        WHERE liib.instance_id = ?`,
      [id]
    );

    const [progress] = await promisePool.query(
      `SELECT lip.*,
              COALESCE(
                CONCAT(i.first_name, ' ', i.last_name),
                s.first_name,
                lip.user_id
              ) AS userName,
              u.email
         FROM learning_item_progress lip
         JOIN users u ON u.uuid = lip.user_id
    LEFT JOIN instructors i ON i.user_id = lip.user_id
    LEFT JOIN students    s ON s.user_id = lip.user_id
        WHERE lip.instance_id = ?
     ORDER BY lip.updated_at DESC`,
      [id]
    );

    return { ...instance, batches, progress };
  }

  async updateInstance(id, userId, data) {
    const {
      title, description, assignedToAll, batchIds,
      startDate, deadline, maxAttempts, passingScore, status,
    } = data;

    if (startDate && deadline && new Date(deadline) <= new Date(startDate)) {
      throw new Error('VALIDATION_ERROR: Deadline must be after the start date');
    }

    const conn = await promisePool.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query(
        `UPDATE learning_item_instances
            SET title           = ?,
                description     = ?,
                assigned_to_all = ?,
                start_date      = ?,
                deadline        = ?,
                max_attempts    = ?,
                passing_score   = ?,
                status          = ?,
                updated_at      = NOW()
          WHERE id = ?`,
        [
          title?.trim(),
          description?.trim() || null,
          assignedToAll ? 1 : 0,
          startDate || null,
          deadline || null,
          maxAttempts || null,
          passingScore || null,
          status,
          id,
        ]
      );

      await conn.query(
        'DELETE FROM learning_item_instance_batches WHERE instance_id = ?',
        [id]
      );
      if (!assignedToAll && batchIds && batchIds.length > 0) {
        const batchValues = batchIds.map(bid => [id, bid]);
        await conn.query(
          'INSERT IGNORE INTO learning_item_instance_batches (instance_id, batch_id) VALUES ?',
          [batchValues]
        );
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async deleteInstance(id) {
    await promisePool.query(
      'DELETE FROM learning_item_instances WHERE id = ?',
      [id]
    );
    return true;
  }

  async closeInstance(id) {
    await promisePool.query(
      `UPDATE learning_item_instances SET status = 'closed', updated_at = NOW() WHERE id = ?`,
      [id]
    );
    return true;
  }

  async getInstanceProgress(instanceId) {
    const [rows] = await promisePool.query(
      `SELECT lip.*,
              COALESCE(
                CONCAT(i.first_name, ' ', i.last_name),
                s.first_name,
                lip.user_id
              ) AS userName,
              u.email
         FROM learning_item_progress lip
         JOIN users u ON u.uuid = lip.user_id
    LEFT JOIN instructors i ON i.user_id = lip.user_id
    LEFT JOIN students    s ON s.user_id = lip.user_id
        WHERE lip.instance_id = ?
     ORDER BY lip.updated_at DESC`,
      [instanceId]
    );
    return rows;
  }
}

module.exports = new LearningItemService();
