const { promisePool: pool } = require('../../config/db');

/**
 * Return the list of teams a learner belongs to. Each team carries
 * organisational context + the manager's display name + a member count.
 *
 * NOTE: by design we do NOT return individual member rows here — a regular
 * learner is allowed to know they're in a team and who runs it, but not to
 * browse other members' data.
 */
async function getMyTeams(userUuid) {
  if (!userUuid) return [];
  const [rows] = await pool.query(
    `SELECT
        t.id,
        t.name,
        t.description,
        t.organization_id,
        o.name AS organization_name,
        t.manager_id,
        NULLIF(TRIM(CONCAT_WS(' ',
          COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name),
          COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)
        )), '') AS manager_name,
        (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) AS member_count,
        CASE WHEN t.manager_id = ? THEN 1 ELSE 0 END AS is_manager
       FROM team_members tm
       INNER JOIN teams t ON t.id = tm.team_id AND t.is_deleted = 0
       LEFT JOIN organizations o ON o.id = t.organization_id
       LEFT JOIN students s      ON t.manager_id = s.user_id
       LEFT JOIN admins a        ON t.manager_id = a.user_id
       LEFT JOIN instructors i   ON t.manager_id = i.user_id
       LEFT JOIN super_admins sa ON t.manager_id = sa.user_id
      WHERE tm.user_id = ?
      ORDER BY t.name`,
    [userUuid, userUuid]
  );
  return rows;
}

/**
 * Return the roster of a team a learner belongs to. Only identity-level fields
 * (name + role + manager flag) — no progress, no scores, no contact details.
 *
 * Access check: the caller must themselves be a member of the team. The
 * EXISTS clause enforces that — if it doesn't hold, the result set is empty.
 */
async function getMyTeamMembers(userUuid, teamId) {
  if (!userUuid || !teamId) return [];
  const [rows] = await pool.query(
    `SELECT
        u.uuid AS id,
        TRIM(CONCAT(COALESCE(s.first_name, a.first_name, i.first_name, ''), ' ',
                    COALESCE(s.last_name,  a.last_name,  i.last_name,  ''))) AS name,
        UPPER(LEFT(COALESCE(s.first_name, a.first_name, i.first_name, u.email), 1)) AS initial,
        CASE u.role_id
          WHEN 1 THEN 'Learner'
          WHEN 2 THEN 'Instructor'
          WHEN 3 THEN 'Admin'
          WHEN 4 THEN 'Super Admin'
          ELSE 'Unknown'
        END AS role_label,
        CASE WHEN t.manager_id = u.uuid THEN 1 ELSE 0 END AS is_manager
       FROM team_members tm
       INNER JOIN users u ON u.uuid = tm.user_id AND u.is_deleted = 0
       INNER JOIN teams t ON t.id = tm.team_id AND t.is_deleted = 0
       LEFT JOIN students s    ON s.user_id = u.uuid
       LEFT JOIN admins a      ON a.user_id = u.uuid
       LEFT JOIN instructors i ON i.user_id = u.uuid
      WHERE tm.team_id = ?
        AND EXISTS (
          SELECT 1 FROM team_members me
           WHERE me.team_id = ? AND me.user_id = ?
        )
      ORDER BY (t.manager_id = u.uuid) DESC, name`,
    [teamId, teamId, userUuid]
  );
  return rows;
}

module.exports = { getMyTeams, getMyTeamMembers };
