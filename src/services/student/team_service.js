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

module.exports = { getMyTeams };
