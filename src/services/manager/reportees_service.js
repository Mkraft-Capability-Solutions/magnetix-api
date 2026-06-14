const { promisePool } = require('../../config/db');
const adminAssignmentService = require('../admin/assignment_service');
const { getDescendantUserUuids } = require('../../utils/manager_hierarchy');

/**
 * Reportee-centric views for the manager UI.
 *
 * "Reportees" = the set of users who report to the caller directly OR
 * transitively via users.reports_to_uuid. A user with at least one reportee
 * (and an organization mapping) is treated as a manager regardless of their
 * formal role_id — see manager_middleware.requireAnyManagerRole and the
 * earlier widening of getVisibleLearnerUuids.
 */

/**
 * List the caller's reportees enriched with profile data and submission
 * activity. Empty array if the user has no descendants.
 */
async function listReportees(rootUuid) {
  const reporteeIds = await getDescendantUserUuids(rootUuid);
  if (reporteeIds.length === 0) return [];

  const placeholders = reporteeIds.map(() => '?').join(',');
  const [rows] = await promisePool.query(
    `SELECT
        u.uuid AS user_id,
        u.email,
        u.role_id,
        u.reports_to_uuid,
        COALESCE(st.first_name, ad.first_name, ins.first_name, sa.first_name) AS first_name,
        COALESCE(st.last_name,  ad.last_name,  ins.last_name,  sa.last_name)  AS last_name,
        (
          SELECT COUNT(*)
            FROM assignment_submissions s
            INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
           WHERE s.user_id = u.uuid
        ) AS submission_count,
        (
          SELECT MAX(s.submitted_at)
            FROM assignment_submissions s
            INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
           WHERE s.user_id = u.uuid
        ) AS last_activity_at
       FROM users u
       LEFT JOIN students st     ON st.user_id = u.uuid
       LEFT JOIN admins ad       ON ad.user_id = u.uuid
       LEFT JOIN instructors ins ON ins.user_id = u.uuid
       LEFT JOIN super_admins sa ON sa.user_id = u.uuid
      WHERE u.uuid IN (${placeholders})
        AND u.is_deleted = 0
      ORDER BY first_name, last_name, u.email`,
    reporteeIds
  );

  return rows.map((r) => ({
    user_id: r.user_id,
    email: r.email,
    role_id: r.role_id,
    first_name: r.first_name,
    last_name: r.last_name,
    full_name:
      [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email,
    is_direct_report: r.reports_to_uuid === rootUuid,
    submission_count: Number(r.submission_count || 0),
    last_activity_at: r.last_activity_at
  }));
}

/**
 * Flat, paginated list of every assignment_submissions row made by ANY of
 * the caller's reportees. The `user_id` filter (if provided) is intersected
 * with the descendant set so a forged value can't widen scope.
 */
async function listReporteeSubmissions(rootUuid, filters = {}) {
  const reporteeIds = await getDescendantUserUuids(rootUuid);
  if (reporteeIds.length === 0) {
    return { rows: [], total: 0 };
  }

  // If the caller filters by user_id, that user must be in their descendant
  // set; otherwise we drop the filter (and return scoped rows) rather than
  // 403, matching the "scoped scope" pattern used elsewhere in this codebase.
  let effectiveUserIds = reporteeIds;
  const safeFilters = { ...filters };
  if (filters.user_id) {
    if (reporteeIds.includes(filters.user_id)) {
      effectiveUserIds = [filters.user_id];
      delete safeFilters.user_id; // already scoped to the single id
    } else {
      return { rows: [], total: 0 };
    }
  }

  return adminAssignmentService.listSubmissionsForUsers(effectiveUserIds, safeFilters);
}

/**
 * Profile + submissions for a single reportee. 404-style null if the target
 * is not in the caller's descendant set.
 */
async function getReportee(rootUuid, reporteeId) {
  const reporteeIds = await getDescendantUserUuids(rootUuid);
  if (!reporteeIds.includes(reporteeId)) return null;

  const [profileRows] = await promisePool.query(
    `SELECT
        u.uuid AS user_id, u.email, u.role_id, u.reports_to_uuid, u.status,
        COALESCE(st.first_name, ad.first_name, ins.first_name, sa.first_name) AS first_name,
        COALESCE(st.last_name,  ad.last_name,  ins.last_name,  sa.last_name)  AS last_name
       FROM users u
       LEFT JOIN students st     ON st.user_id = u.uuid
       LEFT JOIN admins ad       ON ad.user_id = u.uuid
       LEFT JOIN instructors ins ON ins.user_id = u.uuid
       LEFT JOIN super_admins sa ON sa.user_id = u.uuid
      WHERE u.uuid = ? AND u.is_deleted = 0
      LIMIT 1`,
    [reporteeId]
  );
  const profile = profileRows[0];
  if (!profile) return null;

  const submissions = await adminAssignmentService.listSubmissionsForUsers(
    [reporteeId],
    { limit: 200 }
  );

  return {
    profile: {
      user_id: profile.user_id,
      email: profile.email,
      role_id: profile.role_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name:
        [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.email,
      status: profile.status,
      is_direct_report: profile.reports_to_uuid === rootUuid
    },
    submissions: submissions.rows,
    submissions_total: submissions.total
  };
}

module.exports = {
  listReportees,
  listReporteeSubmissions,
  getReportee
};
