const { promisePool: pool } = require('../../config/db');
const { writeAudit } = require('../../utils/audit_log');

/**
 * Org Hierarchy Service — the reporting-line org chart built from
 * `users.reports_to_uuid`.
 *
 * The whole active user set is fetched in one query (with profile name + role
 * label) and the forest is assembled in JS. This avoids recursive-CTE depth
 * surprises and is simple to reason about; for very large orgs the tree can be
 * scoped to a subtree via `rootUuid`.
 */

/**
 * One flat row per active user, with display name + role label + manager link.
 */
const fetchUserRows = async () => {
  const [rows] = await pool.query(
    `SELECT
        u.uuid                                   AS uuid,
        u.email                                  AS email,
        u.reports_to_uuid                        AS managerUuid,
        u.role_id                                AS roleId,
        COALESCE(r.label, '')                    AS roleLabel,
        TRIM(CONCAT(COALESCE(profile.first_name,''), ' ', COALESCE(profile.last_name,''))) AS name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL SELECT user_id, first_name, last_name FROM instructors
        UNION ALL SELECT user_id, first_name, last_name FROM admins
     ) profile ON u.uuid = profile.user_id
     WHERE (u.is_deleted IS NULL OR u.is_deleted = 0)
       AND u.status = 'active'`
  );
  return rows.map((r) => ({
    uuid: r.uuid,
    email: r.email,
    managerUuid: r.managerUuid || null,
    roleId: r.roleId,
    roleLabel: r.roleLabel,
    name: r.name && r.name.trim() ? r.name.trim() : r.email
  }));
};

/**
 * Build a forest (or a single subtree when rootUuid is given) from flat rows.
 */
const buildTree = (rows, rootUuid = null, maxDepth = 100) => {
  const byUuid = new Map();
  rows.forEach((r) => byUuid.set(r.uuid, { ...r, directReports: 0, children: [] }));

  const roots = [];
  for (const node of byUuid.values()) {
    const parent = node.managerUuid ? byUuid.get(node.managerUuid) : null;
    if (parent) {
      parent.children.push(node);
      parent.directReports += 1;
    } else {
      // No manager, or manager not in the active set -> a root of the forest.
      roots.push(node);
    }
  }

  // Depth trimming helper.
  const trim = (node, depth) => {
    if (depth >= maxDepth) {
      node.children = [];
    } else {
      node.children.forEach((c) => trim(c, depth + 1));
    }
    return node;
  };

  if (rootUuid) {
    const sub = byUuid.get(rootUuid);
    return sub ? [trim(sub, 0)] : [];
  }
  roots.forEach((r) => trim(r, 0));
  // Sort roots: super admins / admins first, then by name.
  roots.sort((a, b) => a.roleId - b.roleId || a.name.localeCompare(b.name));
  return roots;
};

/**
 * Full reporting-line tree (optionally scoped to a subtree + max depth).
 */
const getTree = async ({ rootUuid = null, depth } = {}) => {
  const rows = await fetchUserRows();
  const maxDepth = depth ? Math.max(1, parseInt(depth, 10)) : 100;
  const tree = buildTree(rows, rootUuid, maxDepth);
  return {
    tree,
    totalUsers: rows.length,
    rootCount: tree.length
  };
};

/**
 * Lightweight search across name/email for the "jump to person" box.
 */
const searchUsers = async (q) => {
  if (!q || !q.trim()) return [];
  const term = `%${q.trim()}%`;
  const [rows] = await pool.query(
    `SELECT
        u.uuid AS uuid,
        u.email AS email,
        COALESCE(r.label, '') AS roleLabel,
        TRIM(CONCAT(COALESCE(profile.first_name,''), ' ', COALESCE(profile.last_name,''))) AS name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL SELECT user_id, first_name, last_name FROM instructors
        UNION ALL SELECT user_id, first_name, last_name FROM admins
     ) profile ON u.uuid = profile.user_id
     WHERE (u.is_deleted IS NULL OR u.is_deleted = 0)
       AND u.status = 'active'
       AND (profile.first_name LIKE ? OR profile.last_name LIKE ? OR u.email LIKE ?)
     ORDER BY name
     LIMIT 25`,
    [term, term, term]
  );
  return rows.map((r) => ({
    uuid: r.uuid,
    email: r.email,
    roleLabel: r.roleLabel,
    name: r.name && r.name.trim() ? r.name.trim() : r.email
  }));
};

/**
 * Single node detail: the user, their manager, and their direct reports.
 */
const getUserNode = async (uuid) => {
  const rows = await fetchUserRows();
  const map = new Map(rows.map((r) => [r.uuid, r]));
  const node = map.get(uuid);
  if (!node) return null;

  const manager = node.managerUuid ? map.get(node.managerUuid) || null : null;
  const directReports = rows.filter((r) => r.managerUuid === uuid);

  return {
    user: node,
    manager: manager
      ? { uuid: manager.uuid, name: manager.name, email: manager.email, roleLabel: manager.roleLabel }
      : null,
    directReports: directReports.map((d) => ({
      uuid: d.uuid, name: d.name, email: d.email, roleLabel: d.roleLabel
    }))
  };
};

/**
 * Walk up the proposed manager's chain; return true if `uuid` appears (= cycle).
 */
const wouldCreateCycle = (rows, uuid, proposedManagerUuid) => {
  const map = new Map(rows.map((r) => [r.uuid, r]));
  let cursor = proposedManagerUuid;
  const seen = new Set();
  while (cursor) {
    if (cursor === uuid) return true;       // the user is an ancestor of the proposed manager
    if (seen.has(cursor)) break;            // pre-existing cycle guard
    seen.add(cursor);
    const m = map.get(cursor);
    cursor = m ? m.managerUuid : null;
  }
  return false;
};

/**
 * Reassign (or clear) a user's manager. Validates existence, self-reference and
 * cycles, then writes the link and an audit row.
 */
const reassignManager = async (uuid, managerUuid, actorUuid) => {
  const newManager = managerUuid || null;

  if (newManager && newManager === uuid) {
    return { success: false, status: 400, message: 'A user cannot report to themselves' };
  }

  const rows = await fetchUserRows();
  const map = new Map(rows.map((r) => [r.uuid, r]));

  const target = map.get(uuid);
  if (!target) {
    return { success: false, status: 404, message: 'User not found' };
  }

  if (newManager) {
    if (!map.get(newManager)) {
      return { success: false, status: 404, message: 'Proposed manager not found' };
    }
    if (wouldCreateCycle(rows, uuid, newManager)) {
      return {
        success: false,
        status: 409,
        message: 'That assignment would create a reporting cycle'
      };
    }
  }

  await pool.query('UPDATE users SET reports_to_uuid = ? WHERE uuid = ?', [newManager, uuid]);

  await writeAudit({
    actorUuid,
    action: 'user.manager.reassign',
    targetType: 'user',
    targetId: uuid,
    detail: { from: target.managerUuid, to: newManager }
  });

  return { success: true, message: newManager ? 'Manager reassigned successfully' : 'Manager cleared successfully' };
};

module.exports = {
  getTree,
  searchUsers,
  getUserNode,
  reassignManager
};
