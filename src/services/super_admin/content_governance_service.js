const { promisePool: pool } = require('../../config/db');
const catalogService = require('../admin/catalog_service');
const { writeAudit } = require('../../utils/audit_log');

/**
 * Content Governance Service.
 *
 *  - Taxonomy CRUD delegates to the existing CatalogService (category /
 *    sub_category) so we operate on the same tables the SuperAdmin Catalog
 *    page already uses — no schema duplication.
 *  - Course lifecycle is a state machine over the `course.status` ENUM
 *    ('draft','pending','published','archived'). Every transition is validated
 *    and recorded in `course_lifecycle_history` + the shared audit log.
 *  - Course structure is a read-only Course -> Section -> Lesson tree.
 */

// ------------------------------------------------------------ Taxonomy
// Thin pass-throughs to CatalogService so the controller has one surface.

const getTaxonomy = () => catalogService.getCategoriesWithSubcategories();
const addCategory = (name, description, creatorId) => catalogService.addCategory(name, description, creatorId);
const updateCategory = (id, name, description, updatedBy) => catalogService.updateCategory(id, name, description, updatedBy);
const deleteCategory = (id) => catalogService.deleteCategory(id);
const addSubcategory = (categoryId, name, description, creatorId) => catalogService.addSubcategory(categoryId, name, description, creatorId);
const updateSubcategory = (id, name, description, updatedBy) => catalogService.updateSubcategory(id, name, description, updatedBy);
const deleteSubcategory = (id) => catalogService.deleteSubcategory(id);

// ------------------------------------------------------- Lifecycle queue

const VALID_STATUSES = ['draft', 'pending', 'published', 'archived'];

/**
 * Courses for the governance queue, optionally filtered by lifecycle status.
 */
const getCourses = async (filters = {}) => {
  const { status } = filters;
  const where = ['c.is_deleted = 0'];
  const params = [];
  if (status && VALID_STATUSES.includes(status)) {
    where.push('c.status = ?');
    params.push(status);
  }
  const whereClause = where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT
        c.id,
        c.title,
        c.status,
        c.published_at      AS publishedAt,
        c.updated_at        AS updatedAt,
        c.created_at        AS createdAt,
        cat.name            AS categoryName,
        TRIM(CONCAT(COALESCE(creator.first_name,''),' ',COALESCE(creator.last_name,''))) AS creatorName,
        (SELECT COUNT(*) FROM course_section s WHERE s.course_id = c.id AND s.is_deleted = 0) AS sectionCount,
        (SELECT COUNT(*) FROM course_lesson  l WHERE l.course_id = c.id AND l.is_deleted = 0) AS lessonCount
     FROM course c
     LEFT JOIN course_category cat ON c.category_id = cat.id
     LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL SELECT user_id, first_name, last_name FROM instructors
        UNION ALL SELECT user_id, first_name, last_name FROM admins
     ) creator ON c.creator_id = creator.user_id
     WHERE ${whereClause}
     ORDER BY c.updated_at DESC`,
    params
  );

  // Status tallies for the queue header chips.
  const [counts] = await pool.query(
    `SELECT status, COUNT(*) AS n FROM course WHERE is_deleted = 0 GROUP BY status`
  );
  const countsByStatus = { draft: 0, pending: 0, published: 0, archived: 0 };
  counts.forEach((r) => { countsByStatus[r.status] = r.n; });

  return { courses: rows, countsByStatus };
};

/**
 * Read-only Course -> Section -> Lesson tree.
 */
const getCourseStructure = async (courseId) => {
  const [courseRows] = await pool.query(
    'SELECT id, title, status FROM course WHERE id = ? AND is_deleted = 0',
    [courseId]
  );
  if (courseRows.length === 0) return null;

  const [sections] = await pool.query(
    'SELECT id, title, section_order AS sectionOrder FROM course_section WHERE course_id = ? AND is_deleted = 0 ORDER BY section_order ASC, id ASC',
    [courseId]
  );
  const [lessons] = await pool.query(
    `SELECT id, section_id AS sectionId, title, lesson_type AS lessonType,
            lesson_content_type AS contentType, lesson_order AS lessonOrder
       FROM course_lesson
      WHERE course_id = ? AND is_deleted = 0
      ORDER BY lesson_order ASC, id ASC`,
    [courseId]
  );

  const lessonsBySection = {};
  lessons.forEach((l) => {
    if (!lessonsBySection[l.sectionId]) lessonsBySection[l.sectionId] = [];
    lessonsBySection[l.sectionId].push(l);
  });

  return {
    course: courseRows[0],
    sections: sections.map((s) => ({ ...s, lessons: lessonsBySection[s.id] || [] }))
  };
};

/**
 * Transition history for one course (most recent first).
 */
const getCourseHistory = async (courseId) => {
  const [rows] = await pool.query(
    `SELECT
        h.id,
        h.from_status AS fromStatus,
        h.to_status   AS toStatus,
        h.note,
        h.created_at  AS createdAt,
        h.actor_uuid  AS actorUuid,
        TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))) AS actorName
     FROM course_lifecycle_history h
     LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL SELECT user_id, first_name, last_name FROM instructors
        UNION ALL SELECT user_id, first_name, last_name FROM admins
     ) p ON h.actor_uuid = p.user_id
     WHERE h.course_id = ?
     ORDER BY h.created_at DESC`,
    [courseId]
  );
  return rows;
};

// ---------------------------------------------------- Lifecycle machine

// action -> { from: <required current status>, to: <next status> }
const TRANSITIONS = {
  submit:  { from: 'draft',     to: 'pending' },
  approve: { from: 'pending',   to: 'published' },
  reject:  { from: 'pending',   to: 'draft' },
  archive: { from: 'published', to: 'archived' },
  restore: { from: 'archived',  to: 'draft' }
};

/**
 * Apply a lifecycle action to a course. Rejects illegal transitions with 409.
 */
const transitionLifecycle = async (courseId, action, note, actorUuid) => {
  const rule = TRANSITIONS[action];
  if (!rule) {
    return { success: false, status: 400, message: `Unknown action: ${action}` };
  }

  const [rows] = await pool.query(
    'SELECT id, status FROM course WHERE id = ? AND is_deleted = 0',
    [courseId]
  );
  if (rows.length === 0) {
    return { success: false, status: 404, message: 'Course not found' };
  }

  const current = rows[0].status;
  if (current !== rule.from) {
    return {
      success: false,
      status: 409,
      message: `Cannot ${action} a course in '${current}' state (requires '${rule.from}')`
    };
  }

  // Build the UPDATE with action-specific side effects.
  const sets = ['status = ?'];
  const params = [rule.to];
  if (action === 'submit') {
    sets.push('submitted_by = ?');
    params.push(actorUuid);
  } else if (action === 'approve') {
    sets.push('reviewed_by = ?', 'published_at = NOW()');
    params.push(actorUuid);
  } else if (action === 'reject') {
    sets.push('reviewed_by = ?');
    params.push(actorUuid);
  }
  params.push(courseId);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE course SET ${sets.join(', ')} WHERE id = ?`, params);
    await connection.query(
      `INSERT INTO course_lifecycle_history (course_id, from_status, to_status, actor_uuid, note)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, current, rule.to, actorUuid, note || null]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await writeAudit({
    actorUuid,
    action: 'course.lifecycle',
    targetType: 'course',
    targetId: courseId,
    detail: { action, from: current, to: rule.to, note: note || null }
  });

  return { success: true, message: `Course ${action} successful`, data: { status: rule.to } };
};

module.exports = {
  // taxonomy
  getTaxonomy,
  addCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  // courses
  getCourses,
  getCourseStructure,
  getCourseHistory,
  transitionLifecycle,
  TRANSITIONS
};
