const { promisePool } = require('../../config/db');
const adminAssignmentService = require('../admin/assignment_service');
const { getManagedTeamIdsForUser } = require('../../utils/manager_hierarchy');

/**
 * Manager-scoped wrappers around the admin assignment service.
 * Every list/query is restricted to teams the user manages — directly or
 * transitively via the reports_to chain.
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

async function listManagedAssignments(userId, filters = {}) {
  const teamIds = await getManagedTeamIds(userId);
  return adminAssignmentService.listAssignments(filters, { restrictTeamIds: teamIds });
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
  const memberIds = await getManagedTeamMemberIds(userId);
  return adminAssignmentService.listSubmissions(assignmentId, filters, { restrictUserIds: memberIds });
}

module.exports = {
  getManagedTeamIds,
  getManagedTeamMemberIds,
  listManagedTeams,
  listManagedAssignments,
  listManagedAssignmentsForTeam,
  listManagedSubmissions
};
