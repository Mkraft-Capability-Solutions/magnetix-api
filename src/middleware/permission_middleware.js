/**
 * Granular permission enforcement — companion to `authorize(...roles)`.
 *
 * `requirePermission(key)` gates a route on a single permission key (e.g.
 * 'content.taxonomy.manage'). It is ADDITIVE: existing routes keep using
 * `authorize(roleId)` untouched, and new/RBAC-aware routes layer this on top.
 *
 * Design guarantees that make this safe to roll out incrementally:
 *   1. Super admin (role_id === 4) ALWAYS bypasses — nothing the super admin
 *      can already do breaks, and the new super-admin sections keep working
 *      even before the permission catalog is fully wired.
 *   2. A role's permission set is resolved once and cached in-memory with a
 *      short TTL, so per-request DB load stays low. The RBAC service calls
 *      `bustPermissionCache(roleId)` whenever grants change so changes take
 *      effect promptly.
 *
 * Must run AFTER `authenticate` (it reads `req.user.role_id`).
 */

const { promisePool } = require('../config/db');

const ROLE_SUPER_ADMIN = 4;
const CACHE_TTL_MS = 60 * 1000; // 60s

// role_id -> { keys: Set<string>, exp: number }
const cache = new Map();

/**
 * Load the set of permission keys granted to a role, using the TTL cache.
 * @param {number} roleId
 * @returns {Promise<Set<string>>}
 */
async function getRolePermissionKeys(roleId) {
  const now = Date.now();
  const cached = cache.get(roleId);
  if (cached && cached.exp > now) {
    return cached.keys;
  }

  const [rows] = await promisePool.query(
    `SELECT p.perm_key
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?`,
    [roleId]
  );

  const keys = new Set(rows.map((r) => r.perm_key));
  cache.set(roleId, { keys, exp: now + CACHE_TTL_MS });
  return keys;
}

/**
 * Express middleware factory: gate a route on a single permission key.
 * @param {string} permKey
 */
function requirePermission(permKey) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Super admin bypass — never gated.
      if (user.role_id === ROLE_SUPER_ADMIN) {
        return next();
      }

      const keys = await getRolePermissionKeys(user.role_id);
      if (keys.has(permKey)) {
        return next();
      }

      return res.status(403).json({ message: `Missing permission: ${permKey}` });
    } catch (error) {
      console.error('requirePermission error:', error);
      return res.status(500).json({ message: 'Permission check failed' });
    }
  };
}

/**
 * Invalidate the cached permission set for a role (or all roles).
 * Called by the RBAC service after any grant/revoke/role change.
 * @param {number} [roleId] - omit to clear the entire cache
 */
function bustPermissionCache(roleId) {
  if (roleId === undefined || roleId === null) {
    cache.clear();
  } else {
    cache.delete(roleId);
  }
}

module.exports = { requirePermission, bustPermissionCache, getRolePermissionKeys };
