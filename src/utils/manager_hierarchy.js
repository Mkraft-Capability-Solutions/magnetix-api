const { promisePool } = require('../config/db');

const MAX_HIERARCHY_DEPTH = 12;

/**
 * Return the set of users who report to `rootUuid` directly OR transitively.
 * The root itself is NOT included. Cycles are broken by a visited-set guard,
 * and we hard-cap recursion at MAX_HIERARCHY_DEPTH so a malformed graph can't
 * spin the server.
 *
 * Implementation: iterative BFS using level-by-level IN (...) expansion. We
 * deliberately avoid MySQL recursive CTEs because not every deployment of this
 * app runs MySQL 8+; the iterative approach is portable to MariaDB/older MySQL.
 *
 * @param {string} rootUuid
 * @returns {Promise<string[]>}
 */
async function getDescendantUserUuids(rootUuid) {
  if (!rootUuid) return [];
  const visited = new Set([rootUuid]);
  const all = [];
  let frontier = [rootUuid];
  let depth = 0;

  while (frontier.length > 0 && depth < MAX_HIERARCHY_DEPTH) {
    const placeholders = frontier.map(() => '?').join(',');
    let rows;
    try {
      [rows] = await promisePool.query(
        `SELECT uuid FROM users
          WHERE reports_to_uuid IN (${placeholders})
            AND is_deleted = 0`,
        frontier
      );
    } catch (err) {
      // The reports_to_uuid column is added by ensureSchema on boot. If for any
      // reason the column isn't present yet (server not restarted after a fresh
      // pull, ALTER TABLE failed silently, etc.), don't blow up the whole login
      // path — degrade to "no descendants" so the user still sees the teams
      // they directly manage.
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        console.warn(
          'manager_hierarchy: users.reports_to_uuid missing — descendant traversal disabled. Restart the API to let ensureSchema add it.'
        );
        return all;
      }
      throw err;
    }
    const next = [];
    for (const r of rows) {
      if (!visited.has(r.uuid)) {
        visited.add(r.uuid);
        all.push(r.uuid);
        next.push(r.uuid);
      }
    }
    frontier = next;
    depth++;
  }
  return all;
}

/**
 * Return the set of team IDs visible to `rootUuid` as a manager — both teams
 * they directly manage AND teams managed by anyone in their downline.
 *
 * @param {string} rootUuid
 * @returns {Promise<number[]>}
 */
async function getManagedTeamIdsForUser(rootUuid) {
  if (!rootUuid) return [];
  const descendants = await getDescendantUserUuids(rootUuid);
  const candidateUuids = [rootUuid, ...descendants];
  const placeholders = candidateUuids.map(() => '?').join(',');
  const [rows] = await promisePool.query(
    `SELECT id FROM teams
      WHERE manager_id IN (${placeholders})
        AND is_deleted = 0`,
    candidateUuids
  );
  return rows.map((r) => r.id);
}

/**
 * Walk UP the chain: return the set of users who are ancestors of `userUuid`
 * (people they report to, and people THOSE people report to, etc.). Used by
 * cycle-prevention checks.
 *
 * @param {string} userUuid
 * @returns {Promise<string[]>}
 */
async function getAncestorUserUuids(userUuid) {
  if (!userUuid) return [];
  const visited = new Set([userUuid]);
  const ancestors = [];
  let cursor = userUuid;
  let depth = 0;

  while (cursor && depth < MAX_HIERARCHY_DEPTH) {
    let rows;
    try {
      [rows] = await promisePool.query(
        'SELECT reports_to_uuid FROM users WHERE uuid = ? AND is_deleted = 0 LIMIT 1',
        [cursor]
      );
    } catch (err) {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        // Same defensive degrade as getDescendantUserUuids — if the column is
        // missing, just stop walking and return what we have.
        return ancestors;
      }
      throw err;
    }
    const next = rows[0] && rows[0].reports_to_uuid ? rows[0].reports_to_uuid : null;
    if (!next || visited.has(next)) break;
    visited.add(next);
    ancestors.push(next);
    cursor = next;
    depth++;
  }
  return ancestors;
}

/**
 * Is `userUuid` allowed to view a team's data based on the team's manager
 * being inside their downline (or themselves)?
 *
 * @param {string} userUuid
 * @param {number} teamId
 * @returns {Promise<boolean>}
 */
async function canUserViewTeamViaHierarchy(userUuid, teamId) {
  if (!userUuid || !teamId) return false;
  const teamIds = await getManagedTeamIdsForUser(userUuid);
  return teamIds.includes(Number(teamId));
}

/**
 * Does the user belong to at least one (active, non-deleted) organization?
 * This is the org-membership half of the "manager via reports_to" gate: a user
 * can only be treated as a non-team manager if they themselves are tied to an
 * organization.
 *
 * @param {string} userUuid
 * @returns {Promise<boolean>}
 */
async function userHasOrganizationMembership(userUuid) {
  if (!userUuid) return false;
  const [rows] = await promisePool.query(
    `SELECT 1
       FROM user_organizations uo
       INNER JOIN organizations o ON o.id = uo.organization_id
      WHERE uo.user_id = ? AND o.is_active = 1
      LIMIT 1`,
    [userUuid]
  );
  return rows.length > 0;
}

/**
 * Does any other user (direct or transitive) report to `userUuid` via the
 * users.reports_to_uuid chain? Cheap shortcut used by auth gates so we don't
 * keep recomputing the full descendant list when we just need a yes/no.
 *
 * @param {string} userUuid
 * @returns {Promise<boolean>}
 */
async function userHasReportees(userUuid) {
  if (!userUuid) return false;
  try {
    const [rows] = await promisePool.query(
      'SELECT 1 FROM users WHERE reports_to_uuid = ? AND is_deleted = 0 LIMIT 1',
      [userUuid]
    );
    return rows.length > 0;
  } catch (err) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      // Same defensive degrade as getDescendantUserUuids — treat as "no
      // reportees" if the column has not been added yet.
      return false;
    }
    throw err;
  }
}

module.exports = {
  MAX_HIERARCHY_DEPTH,
  getDescendantUserUuids,
  getManagedTeamIdsForUser,
  getAncestorUserUuids,
  canUserViewTeamViaHierarchy,
  userHasOrganizationMembership,
  userHasReportees
};
