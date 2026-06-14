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

/** Assemble one learner's full transcript (all sections) by reusing member-activity. */
const getFullTranscript = async (userId) => {
  const [overview, courses, assessments, certificates, learningHours] = await Promise.all([
    memberActivity.getOverview(userId),
    memberActivity.getEnrolledCourses(userId),
    memberActivity.getAssessments(userId),
    memberActivity.getCertificates(userId),
    memberActivity.getLearningHours(userId, 365),
  ]);

  if (!overview.success) {
    return { success: false, status: 404, message: overview.error?.message || 'Learner not found' };
  }

  return {
    success: true,
    data: {
      profile: overview.data.profile,
      stats: overview.data.stats || {},
      courses: courses.success ? (courses.data || []) : [],
      assessments: assessments.success ? (assessments.data || []) : [],
      certificates: certificates.success ? (certificates.data || []) : [],
      learningHours: learningHours.success ? learningHours.data : { daily: [], totalHours: 0 },
    },
  };
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
