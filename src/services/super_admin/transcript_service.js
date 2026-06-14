const { promisePool: pool } = require('../../config/db');
const memberActivity = require('../admin/organization_member_activity_service');

/**
 * Super Admin — Learner Transcripts.
 *
 * Lists learners (role_id = 1) filterable by organization and assembles a full
 * transcript per learner by reusing organization_member_activity_service (which
 * already pulls overview/stats, enrolled courses, assessments, certificates and
 * learning hours by userId). No new DB objects.
 */

const BULK_CAP = 200;

/** Paginated learners, optionally scoped to one organization + a name/email search. */
const getLearners = async ({ orgId, search, page = 1, limit = 20 } = {}) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (p - 1) * l;

  const where = ['u.role_id = 1', '(u.is_deleted = 0 OR u.is_deleted IS NULL)'];
  const params = [];
  if (orgId) { where.push('uo.organization_id = ?'); params.push(Number(orgId)); }
  if (search) {
    const like = `%${search}%`;
    where.push(`(s.first_name LIKE ? OR s.last_name LIKE ? OR u.email LIKE ? OR CONCAT(COALESCE(s.first_name,''),' ',COALESCE(s.last_name,'')) LIKE ?)`);
    params.push(like, like, like, like);
  }
  const whereSql = where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT u.uuid, u.email,
            TRIM(CONCAT(COALESCE(s.first_name,''),' ',COALESCE(s.last_name,''))) AS name,
            GROUP_CONCAT(DISTINCT o.name ORDER BY o.name SEPARATOR ', ') AS organizations
       FROM users u
       LEFT JOIN students s ON s.user_id = u.uuid
       LEFT JOIN user_organizations uo ON uo.user_id = u.uuid
       LEFT JOIN organizations o ON o.id = uo.organization_id
      WHERE ${whereSql}
      GROUP BY u.uuid, u.email, name
      ORDER BY name ASC
      LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  const [[cnt]] = await pool.query(
    `SELECT COUNT(DISTINCT u.uuid) AS total
       FROM users u
       LEFT JOIN students s ON s.user_id = u.uuid
       LEFT JOIN user_organizations uo ON uo.user_id = u.uuid
      WHERE ${whereSql}`,
    params
  );

  const total = Number(cnt.total || 0);
  return {
    learners: rows.map((r) => ({ uuid: r.uuid, email: r.email, name: r.name || '', organizations: r.organizations || '' })),
    pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
  };
};

// --- Deployment-safe inline assembly --------------------------------------
// This DB's `enrol` table has had `progress`/`status` dropped, so we avoid the
// member-activity stored procedures (which SELECT e.progress / e.status) and
// derive everything from columns that exist (enrolled_date, completed_at) +
// course_progress / course_lesson.

const getProfile = async (userId) => {
  const [rows] = await pool.query(
    `SELECT u.uuid AS id, u.email, u.role_id, u.status,
            COALESCE(s.first_name, a.first_name, i.first_name, '') AS first_name,
            COALESCE(s.last_name,  a.last_name,  i.last_name,  '') AS last_name
       FROM users u
       LEFT JOIN students    s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN admins      a ON u.uuid = a.user_id AND u.role_id IN (2, 3)
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 3
      WHERE u.uuid = ? AND u.is_deleted = 0 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const getCoursesInline = async (userId) => {
  const [rows] = await pool.query(
    `SELECT c.id AS course_id, c.title, e.enrolled_date, e.completed_at,
            (SELECT COUNT(*) FROM course_lesson cl WHERE cl.course_id = c.id AND (cl.is_deleted = 0 OR cl.is_deleted IS NULL)) AS total_lessons,
            (SELECT COUNT(*) FROM course_progress cp WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1) AS lessons_completed
       FROM enrol e
       JOIN course c ON c.id = e.course_id
      WHERE e.user_id = ? AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
      ORDER BY e.enrolled_date DESC`,
    [userId]
  );
  return rows.map((r) => {
    const total = Number(r.total_lessons || 0);
    const done = Number(r.lessons_completed || 0);
    const progress = r.completed_at ? 100 : total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      course_id: r.course_id,
      title: r.title,
      status: r.completed_at ? 'completed' : done > 0 ? 'in_progress' : 'enrolled',
      progress,
      enrolled_date: r.enrolled_date,
      completed_at: r.completed_at,
      last_activity: null,
      lessons_completed: done,
    };
  });
};

const getCertificatesInline = async (userId) => {
  const [rows] = await pool.query(
    `SELECT 'self' AS source, id, certificate_name, status, issue_date AS issued_date, expiry_date
       FROM student_certificates WHERE user_id = ?
     UNION ALL
     SELECT 'admin' AS source, id, certificate_name, status, issue_date AS issued_date, expiry_date
       FROM admin_issued_certificates WHERE user_id = ?
     ORDER BY issued_date DESC`,
    [userId, userId]
  );
  return rows.map((r) => ({
    source: r.source, id: r.id, certificate_name: r.certificate_name,
    status: r.status, issued_date: r.issued_date, expiry_date: r.expiry_date || null, link: null,
  }));
};

const getLearningHoursInline = async (userId) => {
  const [[row]] = await pool.query(
    'SELECT COALESCE(SUM(hours_spent), 0) AS totalHours FROM learning_hours_log WHERE user_id = ?',
    [userId]
  );
  return { daily: [], totalHours: Number(row.totalHours || 0), days: 365 };
};

/** Assemble one learner's full transcript from deployment-safe queries. */
const getFullTranscript = async (userId) => {
  const profile = await getProfile(userId);
  if (!profile) return { success: false, status: 404, message: 'Learner not found' };

  const [courses, certificates, learningHours] = await Promise.all([
    getCoursesInline(userId),
    getCertificatesInline(userId),
    getLearningHoursInline(userId),
  ]);

  // Assessments still come from an existing SP; degrade gracefully if incompatible.
  let assessments = [];
  try {
    const a = await memberActivity.getAssessments(userId);
    if (a.success) assessments = a.data || [];
  } catch (err) {
    console.warn('Transcript assessments unavailable:', err.message);
  }

  const completed = courses.filter((c) => c.completed_at).length;
  const stats = {
    total_courses: courses.length,
    completed_courses: completed,
    total_certificates: certificates.length,
  };

  return { success: true, data: { profile, stats, courses, assessments, certificates, learningHours } };
};

/** All learners in an org, each with a full transcript (for the combined PDF). */
const getBulkTranscripts = async (orgId) => {
  const { learners } = await getLearners({ orgId, page: 1, limit: BULK_CAP });
  const transcripts = [];
  for (const lrn of learners) {
    const t = await getFullTranscript(lrn.uuid);
    if (t.success) transcripts.push(t.data);
  }
  return { success: true, data: { transcripts, truncated: learners.length >= BULK_CAP } };
};

module.exports = { getLearners, getFullTranscript, getBulkTranscripts };
