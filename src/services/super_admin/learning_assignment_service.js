const { promisePool: pool } = require('../../config/db');
const emailHelper = require('../../utils/email_helper');

/**
 * Learning Assignment service (Super Admin).
 *
 * A "learning assignment" is a named, trackable bundle: a set of courses assigned
 * to a set of users, with an optional due date, reminders and notifications. It is
 * layered ON TOP of the existing `enrol` mechanism — creating an assignment also
 * enrols each user in each course (deduped, with the due date) exactly like the
 * existing bulk-enroll flow, so it plugs into all existing progress tracking.
 *
 * Everything here is additive: three new tables (created idempotently) plus reads
 * against existing tables (enrol, course_progress, users, profile tables). No
 * existing table schema, procedure, route or service is modified.
 *
 * Progress is derived the same drift-safe way the live procedures do it — from
 * `course_progress` (completed lessons) vs the lesson count — NOT from any
 * `enrol.progress` column (which does not exist on the live DB).
 */

const FRONTEND_URL = process.env.FRONTEND_URL || '';

// Display names live across three profile tables (mirrors the other services).
const NAME_SUBQUERY = `(
  SELECT user_id, first_name, last_name FROM students
  UNION ALL SELECT user_id, first_name, last_name FROM instructors
  UNION ALL SELECT user_id, first_name, last_name FROM admins
)`;

// Per-enrollment completion, derived from course_progress (drift-safe).
const ENROLL_PROGRESS_SUBQUERY = `(
  SELECT cp.enroll_id,
         SUM(cp.lesson_completed) AS lessons_done,
         COUNT(*) AS total_lessons,
         CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END AS is_complete
  FROM course_progress cp
  GROUP BY cp.enroll_id
)`;

// --- Schema (idempotent). Also exported for the migration. --------------------
const TABLE_DDL = [
  `CREATE TABLE IF NOT EXISTS learning_assignments (
     id INT AUTO_INCREMENT PRIMARY KEY,
     uuid VARCHAR(36) NOT NULL,
     title VARCHAR(255) NOT NULL,
     description TEXT NULL,
     due_date DATE NULL,
     notify_users TINYINT(1) NOT NULL DEFAULT 0,
     notification_method VARCHAR(10) NULL,
     enable_reminders TINYINT(1) NOT NULL DEFAULT 0,
     reminder_timing VARCHAR(50) NULL,
     created_by VARCHAR(36) NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     is_deleted TINYINT(1) NOT NULL DEFAULT 0,
     UNIQUE KEY uq_la_uuid (uuid),
     KEY idx_la_created_by (created_by),
     KEY idx_la_is_deleted (is_deleted)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS learning_assignment_courses (
     id INT AUTO_INCREMENT PRIMARY KEY,
     assignment_id INT NOT NULL,
     course_id INT NOT NULL,
     UNIQUE KEY uq_lac (assignment_id, course_id),
     KEY idx_lac_assignment (assignment_id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS learning_assignment_users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     assignment_id INT NOT NULL,
     user_id VARCHAR(36) NOT NULL,
     UNIQUE KEY uq_lau (assignment_id, user_id),
     KEY idx_lau_assignment (assignment_id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  for (const ddl of TABLE_DDL) {
    await pool.query(ddl);
  }
  tablesEnsured = true;
}

// --- helpers ------------------------------------------------------------------

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function userStatus(courseCount, completedCourses, lessonsDone) {
  if (courseCount > 0 && completedCourses >= courseCount) return 'Completed';
  if (lessonsDone > 0) return 'In Progress';
  return 'Not Started';
}

// Insert an in-app notification with an action_url (mirrors course_approval_service).
async function pushNotification(recipientUuid, title, message, actionUrl, metadata) {
  await pool.query(
    `INSERT INTO notifications
       (uuid, title, message, notification_type, icon, action_url, metadata, recipient_id, delivery_method)
     VALUES (UUID(), ?, ?, 'course', 'book', ?, ?, ?, 'in-app')`,
    [title, message, actionUrl || null, metadata ? JSON.stringify(metadata) : null, recipientUuid]
  );
}

function sendEmailSafe(opts) {
  if (!opts.to) return;
  Promise.resolve()
    .then(() => emailHelper.sendEmail({ ...opts, text: opts.text || stripHtml(opts.html) }))
    .catch((err) => console.error('Learning assignment email failed:', err.message));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// --- create -------------------------------------------------------------------

const createAssignment = async (payload, actorUuid) => {
  await ensureTables();

  const title = (payload.title || '').trim();
  const description = payload.description ? String(payload.description).trim() : null;
  const dueDate = payload.dueDate || null; // 'YYYY-MM-DD' or null
  const notifyUsers = payload.notifyUsers ? 1 : 0;
  const notificationMethod = notifyUsers ? (payload.notificationMethod || 'both') : null;
  const enableReminders = payload.enableReminders ? 1 : 0;
  const reminderTiming = enableReminders ? (payload.reminderTiming || null) : null;

  const userIds = Array.isArray(payload.userIds) ? [...new Set(payload.userIds.map(String))] : [];
  const courseIds = Array.isArray(payload.courseIds)
    ? [...new Set(payload.courseIds.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n)))]
    : [];

  if (!title) return { success: false, status: 400, message: 'Assignment name is required' };
  if (userIds.length === 0) return { success: false, status: 400, message: 'Select at least one user' };
  if (courseIds.length === 0) return { success: false, status: 400, message: 'Select at least one learning item' };

  const connection = await pool.getConnection();
  let assignmentId;
  try {
    await connection.beginTransaction();

    const [ins] = await connection.query(
      `INSERT INTO learning_assignments
         (uuid, title, description, due_date, notify_users, notification_method,
          enable_reminders, reminder_timing, created_by)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, dueDate, notifyUsers, notificationMethod, enableReminders, reminderTiming, actorUuid || null]
    );
    assignmentId = ins.insertId;

    await connection.query(
      'INSERT IGNORE INTO learning_assignment_courses (assignment_id, course_id) VALUES ?',
      [courseIds.map((cid) => [assignmentId, cid])]
    );
    await connection.query(
      'INSERT IGNORE INTO learning_assignment_users (assignment_id, user_id) VALUES ?',
      [userIds.map((uid) => [assignmentId, uid])]
    );

    // Enrol each user in each course (dedup + deadline), mirroring sp_bulk_enroll_users.
    for (const uid of userIds) {
      for (const cid of courseIds) {
        await connection.query(
          `INSERT INTO enrol (user_id, course_id, deadline)
           SELECT ?, ?, ? FROM DUAL
           WHERE NOT EXISTS (SELECT 1 FROM enrol WHERE user_id = ? AND course_id = ?)`,
          [uid, cid, dueDate, uid, cid]
        );
        if (dueDate) {
          await connection.query(
            'UPDATE enrol SET deadline = ? WHERE user_id = ? AND course_id = ?',
            [dueDate, uid, cid]
          );
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  // Notifications (best-effort, never block the create).
  if (notifyUsers) {
    try {
      const [recipients] = await pool.query(
        'SELECT uuid, email FROM users WHERE uuid IN (?)',
        [userIds]
      );
      const link = FRONTEND_URL ? `${FRONTEND_URL}/trainee/my-learnings/courses` : '/trainee/my-learnings/courses';
      const wantInApp = notificationMethod === 'inapp' || notificationMethod === 'both';
      const wantEmail = notificationMethod === 'email' || notificationMethod === 'both';
      for (const r of recipients) {
        if (wantInApp) {
          await pushNotification(
            r.uuid,
            'New learning assigned',
            `You have been assigned "${title}". ${dueDate ? `Due by ${dueDate}.` : ''}`.trim(),
            link,
            { assignmentId, title }
          );
        }
        if (wantEmail) {
          sendEmailSafe({
            to: r.email,
            subject: `New learning assigned: ${title}`,
            html: `<p>Hello,</p><p>You have been assigned <strong>${escapeHtml(title)}</strong>.</p>${
              dueDate ? `<p>Please complete it by <strong>${escapeHtml(dueDate)}</strong>.</p>` : ''
            }<p>Open your <a href="${link}">Courses</a> to get started.</p>`,
          });
        }
      }
    } catch (err) {
      console.error('Learning assignment notification failed:', err.message);
    }
  }

  return { success: true, message: 'Assignment created', data: { id: assignmentId } };
};

// --- list ---------------------------------------------------------------------

const listAssignments = async () => {
  await ensureTables();

  const [rows] = await pool.query(
    `SELECT la.id, la.uuid, la.title AS name,
            (SELECT COUNT(*) FROM learning_assignment_courses lac WHERE lac.assignment_id = la.id) AS itemCount,
            DATE_FORMAT(la.created_at, '%Y-%m-%d') AS assignedDate,
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))), ''), 'System') AS assignedBy,
            (SELECT COUNT(*) FROM learning_assignment_users lau WHERE lau.assignment_id = la.id) AS totalUsers,
            COALESCE(DATE_FORMAT(la.due_date, '%Y-%m-%d'), 'No deadline') AS dueDate
       FROM learning_assignments la
       LEFT JOIN ${NAME_SUBQUERY} p ON p.user_id = la.created_by
      WHERE la.is_deleted = 0
      ORDER BY la.created_at DESC`
  );

  if (rows.length === 0) return { success: true, data: [] };

  const [prog] = await pool.query(
    `SELECT la.id AS assignmentId, lau.user_id AS userId,
            COUNT(lac.course_id) AS courseCount,
            SUM(COALESCE(cc.is_complete, 0)) AS completedCourses,
            SUM(COALESCE(cc.lessons_done, 0)) AS lessonsDone,
            AVG(COALESCE(ROUND(cc.lessons_done * 100.0 / NULLIF(cc.total_lessons, 0), 0), 0)) AS avgProgress
       FROM learning_assignments la
       JOIN learning_assignment_users lau ON lau.assignment_id = la.id
       JOIN learning_assignment_courses lac ON lac.assignment_id = la.id
       LEFT JOIN enrol e ON e.user_id = lau.user_id AND e.course_id = lac.course_id
       LEFT JOIN ${ENROLL_PROGRESS_SUBQUERY} cc ON cc.enroll_id = e.id
      WHERE la.is_deleted = 0
      GROUP BY la.id, lau.user_id`
  );

  // Roll per-user rows up into per-assignment stats.
  const stats = new Map(); // assignmentId -> { done, active, pending, progressSum, users }
  for (const p of prog) {
    const s = stats.get(p.assignmentId) || { done: 0, active: 0, pending: 0, progressSum: 0, users: 0 };
    const status = userStatus(Number(p.courseCount), Number(p.completedCourses), Number(p.lessonsDone));
    if (status === 'Completed') s.done += 1;
    else if (status === 'In Progress') s.active += 1;
    else s.pending += 1;
    s.progressSum += Number(p.avgProgress) || 0;
    s.users += 1;
    stats.set(p.assignmentId, s);
  }

  const data = rows.map((r) => {
    const s = stats.get(r.id) || { done: 0, active: 0, pending: 0, progressSum: 0, users: 0 };
    const completionPercentage = s.users > 0 ? Math.round(s.progressSum / s.users) : 0;
    return {
      id: String(r.id),
      name: r.name,
      itemCount: Number(r.itemCount) || 0,
      assignedDate: r.assignedDate,
      assignedBy: r.assignedBy,
      totalUsers: Number(r.totalUsers) || 0,
      completionPercentage,
      doneCount: s.done,
      activeCount: s.active,
      pendingCount: s.pending,
      dueDate: r.dueDate,
    };
  });

  return { success: true, data };
};

// --- detail (per-user progress) ----------------------------------------------

const getAssignmentDetail = async (assignmentId) => {
  await ensureTables();

  const [metaRows] = await pool.query(
    `SELECT la.id, la.title AS name,
            DATE_FORMAT(la.created_at, '%Y-%m-%d') AS assignedDate,
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))), ''), 'System') AS assignedBy,
            COALESCE(DATE_FORMAT(la.due_date, '%Y-%m-%d'), 'No deadline') AS dueDate
       FROM learning_assignments la
       LEFT JOIN ${NAME_SUBQUERY} p ON p.user_id = la.created_by
      WHERE la.id = ? AND la.is_deleted = 0`,
    [assignmentId]
  );
  if (metaRows.length === 0) return { success: false, status: 404, message: 'Assignment not found' };

  const [userRows] = await pool.query(
    `SELECT lau.user_id AS id,
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))), ''), u.email) AS name,
            u.email AS email,
            COUNT(lac.course_id) AS courseCount,
            SUM(COALESCE(cc.is_complete, 0)) AS completedCourses,
            SUM(COALESCE(cc.lessons_done, 0)) AS lessonsDone,
            AVG(COALESCE(ROUND(cc.lessons_done * 100.0 / NULLIF(cc.total_lessons, 0), 0), 0)) AS avgProgress,
            MAX(e.last_updated) AS lastActivity
       FROM learning_assignment_users lau
       JOIN learning_assignment_courses lac ON lac.assignment_id = lau.assignment_id
       LEFT JOIN users u ON u.uuid = lau.user_id
       LEFT JOIN ${NAME_SUBQUERY} p ON p.user_id = lau.user_id
       LEFT JOIN enrol e ON e.user_id = lau.user_id AND e.course_id = lac.course_id
       LEFT JOIN ${ENROLL_PROGRESS_SUBQUERY} cc ON cc.enroll_id = e.id
      WHERE lau.assignment_id = ?
      GROUP BY lau.user_id, u.email
      ORDER BY name`,
    [assignmentId]
  );

  let done = 0, active = 0, pending = 0;
  const users = userRows.map((u) => {
    const status = userStatus(Number(u.courseCount), Number(u.completedCourses), Number(u.lessonsDone));
    if (status === 'Completed') done += 1;
    else if (status === 'In Progress') active += 1;
    else pending += 1;
    return {
      id: String(u.id),
      name: u.name,
      email: u.email || '',
      status,
      progress: Math.round(Number(u.avgProgress) || 0),
      lastActivity: u.lastActivity ? new Date(u.lastActivity).toISOString().slice(0, 10) : 'No activity',
      avatar: initials(u.name),
    };
  });

  const meta = metaRows[0];
  return {
    success: true,
    data: {
      id: String(meta.id),
      name: meta.name,
      assignedDate: meta.assignedDate,
      assignedBy: meta.assignedBy,
      dueDate: meta.dueDate,
      totalUsers: users.length,
      doneCount: done,
      activeCount: active,
      pendingCount: pending,
      users,
    },
  };
};

module.exports = {
  TABLE_DDL,
  createAssignment,
  listAssignments,
  getAssignmentDetail,
};
