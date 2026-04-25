const { promisePool } = require('../../config/db');
const adminAssignmentService = require('../admin/assignment_service');

/**
 * Manager-scoped wrappers around the admin assignment service.
 * Every list/query is restricted to teams the user manages.
 */

async function getManagedTeamIds(userId) {
  const [rows] = await promisePool.query(
    'SELECT id FROM teams WHERE manager_id = ? AND is_deleted = 0',
    [userId]
  );
  return rows.map(r => r.id);
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
  const [rows] = await promisePool.query(
    `SELECT t.id, t.name, t.description, t.organization_id, o.name AS organization_name,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.team_id = t.id AND a.is_deleted = 0) AS assignment_count
       FROM teams t
       LEFT JOIN organizations o ON o.id = t.organization_id
       WHERE t.manager_id = ? AND t.is_deleted = 0
       ORDER BY t.name`,
    [userId]
  );
  return rows;
}

async function listManagedAssignments(userId, filters = {}) {
  const teamIds = await getManagedTeamIds(userId);
  return adminAssignmentService.listAssignments(filters, { restrictTeamIds: teamIds });
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
  listManagedSubmissions
};
