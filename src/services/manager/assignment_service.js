const { promisePool } = require('../../config/db');
const adminAssignmentService = require('../admin/assignment_service');
const {
  getManagedTeamIdsForUser,
  getDescendantUserUuids
} = require('../../utils/manager_hierarchy');

/**
 * Manager-scoped wrappers around the admin assignment service.
 * Every list/query is restricted to learners the user manages — directly via
 * teams, OR transitively via the reports_to chain.
 */

async function getManagedTeamIds(userId) {
  return getManagedTeamIdsForUser(userId);
}

async function getManagedTeamMemberIds(userId, teamId = null) {
  const teamIds = teamId ? [teamId] : await getManagedTeamIds(userId);
  if (teamIds.length === 0) return [];

  const [rows] = await promisePool.query(
    `SELECT DISTINCT user_id FROM team_members WHERE team_id IN (${teamIds.map(() => '?').join(',')})`,
    teamIds
  );
  return rows.map(r => r.user_id);
}

/**
 * Direct/transitive reportees of `userId` via users.reports_to_uuid. A thin
 * wrapper around the manager_hierarchy util — defined here so the service has
 * a single import surface.
 */
async function getReporteeUserIds(userId) {
  return getDescendantUserUuids(userId);
}

/**
 * The full set of learner UUIDs whose submissions this manager is allowed to
 * see. Union of:
 *   1. members of teams the manager directly/transitively manages, AND
 *   2. direct/transitive reportees via the reports_to chain.
 *
 * When `teamId` is provided we narrow to that specific team's members AND
 * still include reportees (so a non-team manager opening one of their
 * reportees' team views still sees them).
 */
async function getVisibleLearnerUuids(userId, teamId = null) {
  const [teamMemberIds, reporteeIds] = await Promise.all([
    getManagedTeamMemberIds(userId, teamId),
    getReporteeUserIds(userId)
  ]);
  const merged = new Set();
  for (const id of teamMemberIds) merged.add(id);
  for (const id of reporteeIds) merged.add(id);
  return Array.from(merged);
}

async function listManagedTeams(userId) {
  const teamIds = await getManagedTeamIds(userId);
  if (teamIds.length === 0) return [];
  const placeholders = teamIds.map(() => '?').join(',');
  const [rows] = await promisePool.query(
    `SELECT t.id, t.name, t.description, t.organization_id, o.name AS organization_name,
            t.manager_id,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.team_id = t.id AND a.is_deleted = 0) AS assignment_count
       FROM teams t
       LEFT JOIN organizations o ON o.id = t.organization_id
       WHERE t.id IN (${placeholders}) AND t.is_deleted = 0
       ORDER BY t.name`,
    teamIds
  );
  return rows;
}

/**
 * Find assignment IDs that any direct/transitive reportee of `userId` has
 * submitted to. Used to widen `listManagedAssignments` for non-team managers
 * (and to enrich existing managers' views with reportee-only assignments that
 * fall outside the team-id restriction).
 */
async function getReporteeSubmittedAssignmentIds(userId) {
  const reporteeIds = await getReporteeUserIds(userId);
  if (reporteeIds.length === 0) return [];
  const placeholders = reporteeIds.map(() => '?').join(',');
  const [rows] = await promisePool.query(
    `SELECT DISTINCT s.assignment_id
       FROM assignment_submissions s
       INNER JOIN assignments a ON a.id = s.assignment_id AND a.is_deleted = 0
      WHERE s.user_id IN (${placeholders})`,
    reporteeIds
  );
  return rows.map((r) => r.assignment_id);
}

async function listManagedAssignments(userId, filters = {}) {
  const [teamIds, reporteeAssignmentIds] = await Promise.all([
    getManagedTeamIds(userId),
    getReporteeSubmittedAssignmentIds(userId)
  ]);
  if (teamIds.length === 0 && reporteeAssignmentIds.length === 0) {
    return { rows: [], total: 0 };
  }

  // Only pass each restriction when its set is non-empty. Passing
  // `restrictTeamIds: []` to the admin service triggers an early-return
  // (back-compat with team-only callers), which would wrongly hide
  // reportee-only assignments for non-team managers. Build an opts shape
  // that includes ONLY the populated restrictions:
  //   - both populated → UNION  (`team_id IN (...) OR id IN (...)`)
  //   - team only      → team-id AND
  //   - reportees only → assignment-id AND
  const opts = {};
  if (teamIds.length > 0 && reporteeAssignmentIds.length > 0) {
    opts.restrictTeamIds = teamIds;
    opts.restrictAssignmentIds = reporteeAssignmentIds;
    opts.unionRestricts = true;
  } else if (teamIds.length > 0) {
    opts.restrictTeamIds = teamIds;
  } else {
    opts.restrictAssignmentIds = reporteeAssignmentIds;
  }
  return adminAssignmentService.listAssignments(filters, opts);
}

/**
 * List assignments for a single team that the caller manages. Intersects the
 * requested teamId with the caller's managed-team set so a forged param can't
 * widen scope.
 */
async function listManagedAssignmentsForTeam(userId, teamId, filters = {}) {
  const managed = await getManagedTeamIds(userId);
  const numericTeamId = Number(teamId);
  if (!managed.includes(numericTeamId)) {
    return { rows: [], total: 0 };
  }
  return adminAssignmentService.listAssignments(filters, { restrictTeamIds: [numericTeamId] });
}

async function listManagedSubmissions(userId, assignmentId, filters = {}) {
  const learnerIds = await getVisibleLearnerUuids(userId);
  return adminAssignmentService.listSubmissions(assignmentId, filters, { restrictUserIds: learnerIds });
}

module.exports = {
  getManagedTeamIds,
  getManagedTeamMemberIds,
  getReporteeUserIds,
  getVisibleLearnerUuids,
  listManagedTeams,
  listManagedAssignments,
  listManagedAssignmentsForTeam,
  listManagedSubmissions
};
