const { promisePool: pool } = require('../../config/db');

/**
 * Super Admin — Organization Insights Service
 *
 * Org-wise dashboard metrics. Everything is scoped to an organization through the
 * `user_organizations` join (user_id -> users.uuid). Uses inline parameterized
 * queries (the optional role/status filters need conditional WHERE clauses).
 *
 * Filters accepted by every function: { startDate, endDate, roleId, status }
 *  - startDate/endDate: 'YYYY-MM-DD' (inclusive); applied to time-bound metrics.
 *  - roleId: 1=learner, 2=instructor, 3=admin, 4=super-admin (optional).
 *  - status: 'active' | 'inactive' (optional).
 */

// Build the user-scope condition applied to a joined `users u` alias.
function userScope({ roleId, status } = {}) {
  const conds = ['(u.is_deleted = 0 OR u.is_deleted IS NULL)'];
  const params = [];
  if (roleId) { conds.push('u.role_id = ?'); params.push(Number(roleId)); }
  if (status === 'active' || status === 'inactive') { conds.push('u.status = ?'); params.push(status); }
  return { sql: conds.join(' AND '), params };
}

// Build an inclusive date-range condition for a column. Returns leading ' AND ...'.
function dateCond(col, startDate, endDate) {
  const conds = [];
  const params = [];
  if (startDate) { conds.push(`${col} >= ?`); params.push(`${startDate} 00:00:00`); }
  if (endDate) { conds.push(`${col} <= ?`); params.push(`${endDate} 23:59:59`); }
  return { sql: conds.length ? ' AND ' + conds.join(' AND ') : '', params };
}

const safeRate = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

/* ----------------------------------------------------------------- Overview */
/** All-organizations comparison: one row per organization. */
const getOverview = async (filters = {}) => {
  const us = userScope(filters);
  const enrolDate = dateCond('e.enrolled_date', filters.startDate, filters.endDate);
  const hoursDate = dateCond('lhl.log_date', filters.startDate, filters.endDate);
  const certDate = dateCond('c.issue_date', filters.startDate, filters.endDate);

  const [orgs] = await pool.query(
    'SELECT id, name, is_active AS isActive FROM organizations ORDER BY name ASC'
  );

  const [users] = await pool.query(
    `SELECT uo.organization_id AS orgId,
            COUNT(DISTINCT u.uuid) AS totalUsers,
            COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.uuid END) AS activeUsers
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
      GROUP BY uo.organization_id`,
    [...us.params]
  );

  const [enrol] = await pool.query(
    `SELECT uo.organization_id AS orgId,
            COUNT(e.id) AS enrollments,
            COUNT(CASE WHEN e.status = 'completed' THEN 1 END) AS completions
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN enrol e ON e.user_id = uo.user_id AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
      WHERE 1=1${enrolDate.sql}
      GROUP BY uo.organization_id`,
    [...us.params, ...enrolDate.params]
  );

  const [hours] = await pool.query(
    `SELECT uo.organization_id AS orgId, COALESCE(SUM(lhl.hours_spent), 0) AS learningHours
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN learning_hours_log lhl ON lhl.user_id = uo.user_id
      WHERE 1=1${hoursDate.sql}
      GROUP BY uo.organization_id`,
    [...us.params, ...hoursDate.params]
  );

  const [assign] = await pool.query(
    `SELECT organization_id AS orgId, COUNT(*) AS activeAssignments
       FROM assignments
      WHERE scope = 'organization' AND is_deleted = 0 AND organization_id IS NOT NULL
        AND NOW() BETWEEN start_date AND end_date
      GROUP BY organization_id`
  );

  const [certs] = await pool.query(
    `SELECT uo.organization_id AS orgId, COUNT(*) AS certifications
       FROM (
         SELECT user_id, issue_date FROM student_certificates WHERE status = 'approved'
         UNION ALL
         SELECT user_id, issue_date FROM admin_issued_certificates WHERE status = 'active'
       ) c
       JOIN user_organizations uo ON uo.user_id = c.user_id
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
      WHERE 1=1${certDate.sql}
      GROUP BY uo.organization_id`,
    [...us.params, ...certDate.params]
  );

  const [active] = await pool.query(
    `SELECT uo.organization_id AS orgId, MAX(ull.login_time) AS lastActiveAt
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN user_login_log ull ON ull.user_uuid = uo.user_id
      GROUP BY uo.organization_id`,
    [...us.params]
  );

  const byId = (rows) => rows.reduce((m, r) => { m[r.orgId] = r; return m; }, {});
  const uM = byId(users), eM = byId(enrol), hM = byId(hours), aM = byId(assign), cM = byId(certs), lM = byId(active);

  return orgs.map((o) => {
    const e = eM[o.id] || {};
    const enrollments = Number(e.enrollments || 0);
    const completions = Number(e.completions || 0);
    return {
      id: o.id,
      name: o.name,
      isActive: !!o.isActive,
      totalUsers: Number(uM[o.id]?.totalUsers || 0),
      activeUsers: Number(uM[o.id]?.activeUsers || 0),
      enrollments,
      completions,
      completionRate: safeRate(completions, enrollments),
      learningHours: Number(hM[o.id]?.learningHours || 0),
      activeAssignments: Number(aM[o.id]?.activeAssignments || 0),
      certifications: Number(cM[o.id]?.certifications || 0),
      lastActiveAt: lM[o.id]?.lastActiveAt || null,
    };
  });
};

/* ------------------------------------------------------------------ Summary */
/** KPI numbers for a single organization. */
const getSummary = async (orgId, filters = {}) => {
  const us = userScope(filters);
  const id = Number(orgId);
  const enrolDate = dateCond('e.enrolled_date', filters.startDate, filters.endDate);
  const compDate = dateCond('e.completed_at', filters.startDate, filters.endDate);
  const hoursDate = dateCond('lhl.log_date', filters.startDate, filters.endDate);
  const loginDate = dateCond('ull.login_time', filters.startDate, filters.endDate);
  const subDate = dateCond('s.submitted_at', filters.startDate, filters.endDate);
  const certDate = dateCond('c.issue_date', filters.startDate, filters.endDate);

  const [[u]] = await pool.query(
    `SELECT COUNT(DISTINCT u.uuid) AS totalUsers,
            COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.uuid END) AS activeUsers,
            COUNT(DISTINCT CASE WHEN u.status <> 'active' THEN u.uuid END) AS inactiveUsers
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
      WHERE uo.organization_id = ?`,
    [...us.params, id]
  );

  const [[e]] = await pool.query(
    `SELECT COUNT(e.id) AS enrollments
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN enrol e ON e.user_id = uo.user_id AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
      WHERE uo.organization_id = ?${enrolDate.sql}`,
    [...us.params, id, ...enrolDate.params]
  );

  const [[comp]] = await pool.query(
    `SELECT COUNT(e.id) AS completions
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN enrol e ON e.user_id = uo.user_id AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
      WHERE uo.organization_id = ? AND e.status = 'completed'${compDate.sql}`,
    [...us.params, id, ...compDate.params]
  );

  const [[h]] = await pool.query(
    `SELECT COALESCE(SUM(lhl.hours_spent), 0) AS learningHours
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN learning_hours_log lhl ON lhl.user_id = uo.user_id
      WHERE uo.organization_id = ?${hoursDate.sql}`,
    [...us.params, id, ...hoursDate.params]
  );

  const [[log]] = await pool.query(
    `SELECT COUNT(ull.id) AS logins, COUNT(DISTINCT ull.user_uuid) AS activeUsersInRange
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN user_login_log ull ON ull.user_uuid = uo.user_id
      WHERE uo.organization_id = ?${loginDate.sql}`,
    [...us.params, id, ...loginDate.params]
  );

  const [[asg]] = await pool.query(
    `SELECT
        COUNT(CASE WHEN NOW() BETWEEN start_date AND end_date THEN 1 END) AS activeAssignments,
        COUNT(CASE WHEN end_date < NOW() THEN 1 END) AS overdueAssignments
       FROM assignments
      WHERE scope = 'organization' AND is_deleted = 0 AND organization_id = ?`,
    [id]
  );

  const [[sub]] = await pool.query(
    `SELECT COUNT(*) AS submissions
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
      WHERE a.scope = 'organization' AND a.organization_id = ?${subDate.sql}`,
    [id, ...subDate.params]
  );

  const [[cert]] = await pool.query(
    `SELECT COUNT(*) AS certificationsIssued
       FROM (
         SELECT user_id, issue_date FROM student_certificates WHERE status = 'approved'
         UNION ALL
         SELECT user_id, issue_date FROM admin_issued_certificates WHERE status = 'active'
       ) c
       JOIN user_organizations uo ON uo.user_id = c.user_id
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
      WHERE uo.organization_id = ?${certDate.sql}`,
    [...us.params, id, ...certDate.params]
  );

  const enrollments = Number(e.enrollments || 0);
  const completions = Number(comp.completions || 0);
  return {
    totalUsers: Number(u.totalUsers || 0),
    activeUsers: Number(u.activeUsers || 0),
    inactiveUsers: Number(u.inactiveUsers || 0),
    enrollments,
    completions,
    completionRate: safeRate(completions, enrollments),
    learningHours: Number(h.learningHours || 0),
    logins: Number(log.logins || 0),
    activeUsersInRange: Number(log.activeUsersInRange || 0),
    activeAssignments: Number(asg.activeAssignments || 0),
    overdueAssignments: Number(asg.overdueAssignments || 0),
    submissions: Number(sub.submissions || 0),
    certificationsIssued: Number(cert.certificationsIssued || 0),
  };
};

/* --------------------------------------------------------------- Engagement */
const getEngagement = async (orgId, filters = {}) => {
  const us = userScope(filters);
  const id = Number(orgId);
  const loginDate = dateCond('ull.login_time', filters.startDate, filters.endDate);

  const [[counts]] = await pool.query(
    `SELECT COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.uuid END) AS activeUsers,
            COUNT(DISTINCT CASE WHEN u.status <> 'active' THEN u.uuid END) AS inactiveUsers
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
      WHERE uo.organization_id = ?`,
    [...us.params, id]
  );

  const [byRole] = await pool.query(
    `SELECT u.role_id AS roleId, COUNT(DISTINCT u.uuid) AS count
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
      WHERE uo.organization_id = ?
      GROUP BY u.role_id
      ORDER BY u.role_id`,
    [...us.params, id]
  );

  const [loginTrend] = await pool.query(
    `SELECT DATE(ull.login_time) AS day,
            COUNT(*) AS logins,
            COUNT(DISTINCT ull.user_uuid) AS activeUsers
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN user_login_log ull ON ull.user_uuid = uo.user_id
      WHERE uo.organization_id = ?${loginDate.sql}
      GROUP BY DATE(ull.login_time)
      ORDER BY day ASC`,
    [...us.params, id, ...loginDate.params]
  );

  const [[last]] = await pool.query(
    `SELECT MAX(ull.login_time) AS lastActiveAt
       FROM user_organizations uo
       JOIN user_login_log ull ON ull.user_uuid = uo.user_id
      WHERE uo.organization_id = ?`,
    [id]
  );

  const ROLE_NAMES = { 1: 'Learner', 2: 'Instructor', 3: 'Admin', 4: 'Super Admin' };
  return {
    activeUsers: Number(counts.activeUsers || 0),
    inactiveUsers: Number(counts.inactiveUsers || 0),
    usersByRole: byRole.map((r) => ({ roleId: r.roleId, role: ROLE_NAMES[r.roleId] || `Role ${r.roleId}`, count: Number(r.count) })),
    loginTrend: loginTrend.map((r) => ({ day: r.day, logins: Number(r.logins), activeUsers: Number(r.activeUsers) })),
    lastActiveAt: last.lastActiveAt || null,
  };
};

/* ----------------------------------------------------------------- Learning */
const getLearning = async (orgId, filters = {}) => {
  const us = userScope(filters);
  const id = Number(orgId);
  const enrolDate = dateCond('e.enrolled_date', filters.startDate, filters.endDate);
  const compDate = dateCond('e.completed_at', filters.startDate, filters.endDate);
  const hoursDate = dateCond('lhl.log_date', filters.startDate, filters.endDate);

  const [enrolTrend] = await pool.query(
    `SELECT DATE(e.enrolled_date) AS day, COUNT(*) AS enrollments
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN enrol e ON e.user_id = uo.user_id AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
      WHERE uo.organization_id = ?${enrolDate.sql}
      GROUP BY DATE(e.enrolled_date)
      ORDER BY day ASC`,
    [...us.params, id, ...enrolDate.params]
  );

  const [compTrend] = await pool.query(
    `SELECT DATE(e.completed_at) AS day, COUNT(*) AS completions
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN enrol e ON e.user_id = uo.user_id AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
      WHERE uo.organization_id = ? AND e.status = 'completed' AND e.completed_at IS NOT NULL${compDate.sql}
      GROUP BY DATE(e.completed_at)
      ORDER BY day ASC`,
    [...us.params, id, ...compDate.params]
  );

  const [hoursTrend] = await pool.query(
    `SELECT lhl.log_date AS day, COALESCE(SUM(lhl.hours_spent), 0) AS hours
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN learning_hours_log lhl ON lhl.user_id = uo.user_id
      WHERE uo.organization_id = ?${hoursDate.sql}
      GROUP BY lhl.log_date
      ORDER BY day ASC`,
    [...us.params, id, ...hoursDate.params]
  );

  const [topCourses] = await pool.query(
    `SELECT c.id, c.title AS name,
            COUNT(e.id) AS enrolled,
            COUNT(CASE WHEN e.status = 'completed' THEN 1 END) AS completed
       FROM user_organizations uo
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
       JOIN enrol e ON e.user_id = uo.user_id AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
       JOIN course c ON c.id = e.course_id AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
      WHERE uo.organization_id = ?
      GROUP BY c.id, c.title
      ORDER BY enrolled DESC
      LIMIT 5`,
    [...us.params, id]
  );

  const totalEnroll = enrolTrend.reduce((s, r) => s + Number(r.enrollments), 0);
  const totalComp = compTrend.reduce((s, r) => s + Number(r.completions), 0);
  return {
    enrollmentTrend: enrolTrend.map((r) => ({ day: r.day, enrollments: Number(r.enrollments) })),
    completionTrend: compTrend.map((r) => ({ day: r.day, completions: Number(r.completions) })),
    hoursTrend: hoursTrend.map((r) => ({ day: r.day, hours: Number(r.hours) })),
    completionRate: safeRate(totalComp, totalEnroll),
    topCourses: topCourses.map((r) => ({ id: r.id, name: r.name, enrolled: Number(r.enrolled), completed: Number(r.completed) })),
  };
};

/* --------------------------------------------------------------- Operations */
const getOperations = async (orgId, filters = {}) => {
  const us = userScope(filters);
  const id = Number(orgId);
  const subDate = dateCond('s.submitted_at', filters.startDate, filters.endDate);
  const certDate = dateCond('c.issue_date', filters.startDate, filters.endDate);

  const [[asg]] = await pool.query(
    `SELECT
        COUNT(*) AS totalAssignments,
        COUNT(CASE WHEN NOW() BETWEEN start_date AND end_date THEN 1 END) AS activeAssignments,
        COUNT(CASE WHEN end_date < NOW() THEN 1 END) AS overdueAssignments,
        COUNT(CASE WHEN start_date > NOW() THEN 1 END) AS upcomingAssignments
       FROM assignments
      WHERE scope = 'organization' AND is_deleted = 0 AND organization_id = ?`,
    [id]
  );

  const [[sub]] = await pool.query(
    `SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) AS submitted,
        COUNT(CASE WHEN s.status = 'reviewed' THEN 1 END) AS reviewed,
        COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) AS rejected
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
      WHERE a.scope = 'organization' AND a.organization_id = ?${subDate.sql}`,
    [id, ...subDate.params]
  );

  const [recentAssignments] = await pool.query(
    `SELECT a.id, a.title, a.type, a.start_date AS startDate, a.end_date AS endDate,
            (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submissions
       FROM assignments a
      WHERE a.scope = 'organization' AND a.is_deleted = 0 AND a.organization_id = ?
      ORDER BY a.end_date DESC
      LIMIT 10`,
    [id]
  );

  const [[cert]] = await pool.query(
    `SELECT COUNT(*) AS certificationsIssued
       FROM (
         SELECT user_id, issue_date FROM student_certificates WHERE status = 'approved'
         UNION ALL
         SELECT user_id, issue_date FROM admin_issued_certificates WHERE status = 'active'
       ) c
       JOIN user_organizations uo ON uo.user_id = c.user_id
       JOIN users u ON u.uuid = uo.user_id AND ${us.sql}
      WHERE uo.organization_id = ?${certDate.sql}`,
    [...us.params, id, ...certDate.params]
  );

  return {
    assignments: {
      total: Number(asg.totalAssignments || 0),
      active: Number(asg.activeAssignments || 0),
      overdue: Number(asg.overdueAssignments || 0),
      upcoming: Number(asg.upcomingAssignments || 0),
    },
    submissions: {
      total: Number(sub.total || 0),
      submitted: Number(sub.submitted || 0),
      reviewed: Number(sub.reviewed || 0),
      rejected: Number(sub.rejected || 0),
    },
    certificationsIssued: Number(cert.certificationsIssued || 0),
    recentAssignments: recentAssignments.map((r) => ({
      id: r.id, title: r.title, type: r.type,
      startDate: r.startDate, endDate: r.endDate, submissions: Number(r.submissions),
    })),
  };
};

/* ------------------------------------------------------------- Actions feed */
const getActions = async (orgId, filters = {}, page = 1, limit = 20) => {
  const id = Number(orgId);
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (p - 1) * l;
  const created = dateCond('pal.created_at', filters.startDate, filters.endDate);

  const [[cnt]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM permission_audit_log pal
       JOIN user_organizations uo ON uo.user_id = pal.actor_uuid
      WHERE uo.organization_id = ?${created.sql}`,
    [id, ...created.params]
  );

  const [rows] = await pool.query(
    `SELECT pal.id, pal.actor_uuid AS actorUuid, pal.action, pal.target_type AS targetType,
            pal.target_id AS targetId, pal.detail_json AS detail, pal.created_at AS createdAt,
            TRIM(CONCAT(COALESCE(st.first_name, ''), ' ', COALESCE(st.last_name, ''))) AS actorName
       FROM permission_audit_log pal
       JOIN user_organizations uo ON uo.user_id = pal.actor_uuid
       LEFT JOIN students st ON st.user_id = pal.actor_uuid
      WHERE uo.organization_id = ?${created.sql}
      ORDER BY pal.created_at DESC
      LIMIT ? OFFSET ?`,
    [id, ...created.params, l, offset]
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      actorName: r.actorName || 'Unknown user',
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      detail: r.detail,
      createdAt: r.createdAt,
    })),
    pagination: { total: Number(cnt.total || 0), page: p, limit: l, totalPages: Math.ceil(Number(cnt.total || 0) / l) },
  };
};

module.exports = {
  getOverview,
  getSummary,
  getEngagement,
  getLearning,
  getOperations,
  getActions,
};
