const { promisePool: pool } = require('../../config/db');
const { bustPermissionCache } = require('../../middleware/permission_middleware');
const { writeAudit } = require('../../utils/audit_log');

/**
 * RBAC Service
 *
 * Manages custom roles, the permission catalog, role↔permission grants and
 * per-user role assignment. The four system roles (ids 1-4) are immutable.
 * Custom roles auto-increment from 100.
 *
 * Every mutation writes an audit row and busts the permission cache so
 * `requirePermission` reflects the change promptly.
 */

const ROLE_SUPER_ADMIN = 4;

// ---------------------------------------------------------------- Roles

/**
 * List all roles with their member counts and granted-permission counts.
 */
const getRoles = async () => {
  const [rows] = await pool.query(
    `SELECT
        r.id,
        r.name,
        r.label,
        r.description,
        r.base_role_id      AS baseRoleId,
        r.is_system         AS isSystem,
        r.is_active         AS isActive,
        r.created_at        AS createdAt,
        COALESCE(uc.cnt, 0) AS userCount,
        COALESCE(pc.cnt, 0) AS permissionCount
     FROM roles r
     LEFT JOIN (
        SELECT role_id, COUNT(*) cnt FROM users
        WHERE (is_deleted IS NULL OR is_deleted = 0)
        GROUP BY role_id
     ) uc ON uc.role_id = r.id
     LEFT JOIN (
        SELECT role_id, COUNT(*) cnt FROM role_permissions GROUP BY role_id
     ) pc ON pc.role_id = r.id
     ORDER BY r.id ASC`
  );
  return rows;
};

/**
 * Create a custom role. Id auto-increments from 100 (system roles keep 1-4).
 */
const createRole = async (data, actorUuid) => {
  const { name, label, description, baseRoleId } = data;

  if (!name || !String(name).trim()) {
    return { success: false, status: 400, message: 'Role name is required' };
  }
  if (!label || !String(label).trim()) {
    return { success: false, status: 400, message: 'Role label is required' };
  }
  const base = Number(baseRoleId);
  if (![1, 2, 3].includes(base)) {
    // A custom role inherits one of the non-super-admin UI buckets. We do not
    // allow base_role_id=4 — minting super admins via custom roles is unsafe.
    return { success: false, status: 400, message: 'baseRoleId must be 1 (learner), 2 (trainer) or 3 (admin)' };
  }

  const normalizedName = String(name).trim().toLowerCase().replace(/\s+/g, '_');

  const [dup] = await pool.query('SELECT id FROM roles WHERE name = ?', [normalizedName]);
  if (dup.length > 0) {
    return { success: false, status: 409, message: 'A role with this name already exists' };
  }

  const [result] = await pool.query(
    `INSERT INTO roles (name, label, description, base_role_id, is_system, is_active)
     VALUES (?, ?, ?, ?, 0, 1)`,
    [normalizedName, String(label).trim(), description || null, base]
  );

  await writeAudit({
    actorUuid,
    action: 'role.create',
    targetType: 'role',
    targetId: result.insertId,
    detail: { name: normalizedName, label, baseRoleId: base }
  });

  return { success: true, message: 'Role created successfully', data: { id: result.insertId } };
};

/**
 * Update a custom role's label/description/active flag. System roles are locked.
 */
const updateRole = async (id, data, actorUuid) => {
  const [rows] = await pool.query('SELECT id, is_system FROM roles WHERE id = ?', [id]);
  if (rows.length === 0) {
    return { success: false, status: 404, message: 'Role not found' };
  }
  if (rows[0].is_system) {
    return { success: false, status: 403, message: 'System roles cannot be modified' };
  }

  const { label, description, isActive } = data;
  const updates = [];
  const values = [];
  if (label !== undefined) { updates.push('label = ?'); values.push(String(label).trim()); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
  if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  if (updates.length === 0) {
    return { success: false, status: 400, message: 'No fields to update' };
  }
  values.push(id);
  await pool.query(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, values);

  await writeAudit({ actorUuid, action: 'role.update', targetType: 'role', targetId: id, detail: data });
  return { success: true, message: 'Role updated successfully' };
};

/**
 * Delete a custom role. Blocked for system roles or roles still assigned to users.
 */
const deleteRole = async (id, actorUuid) => {
  const [rows] = await pool.query('SELECT id, is_system FROM roles WHERE id = ?', [id]);
  if (rows.length === 0) {
    return { success: false, status: 404, message: 'Role not found' };
  }
  if (rows[0].is_system) {
    return { success: false, status: 403, message: 'System roles cannot be deleted' };
  }

  const [inUse] = await pool.query(
    'SELECT COUNT(*) AS n FROM users WHERE role_id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
    [id]
  );
  if (inUse[0].n > 0) {
    return {
      success: false,
      status: 409,
      message: `Cannot delete: ${inUse[0].n} user(s) still hold this role. Reassign them first.`
    };
  }

  await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
  await pool.query('DELETE FROM roles WHERE id = ?', [id]);
  bustPermissionCache(Number(id));

  await writeAudit({ actorUuid, action: 'role.delete', targetType: 'role', targetId: id });
  return { success: true, message: 'Role deleted successfully' };
};

// ---------------------------------------------------------- Permissions

/**
 * Full permission catalog, grouped by module.
 */
const getPermissions = async () => {
  const [rows] = await pool.query(
    `SELECT id, perm_key AS permKey, module, label, description
       FROM permissions
      ORDER BY module ASC, perm_key ASC`
  );
  // Group by module for the matrix UI.
  const grouped = {};
  for (const p of rows) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }
  return { flat: rows, grouped };
};

/**
 * Roles × permissions grid. Returns the role list, the permission catalog and
 * a map of role_id -> Set of granted permission keys.
 */
const getMatrix = async () => {
  const roles = await getRoles();
  const { flat: permissions, grouped } = await getPermissions();
  const [grants] = await pool.query(
    `SELECT rp.role_id AS roleId, p.perm_key AS permKey
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id`
  );
  const matrix = {};
  for (const g of grants) {
    if (!matrix[g.roleId]) matrix[g.roleId] = [];
    matrix[g.roleId].push(g.permKey);
  }
  // Super admin implicitly holds everything (it bypasses checks). Reflect that
  // in the UI so the row reads as fully-granted and read-only.
  matrix[ROLE_SUPER_ADMIN] = permissions.map((p) => p.permKey);

  return { roles, permissions, permissionsByModule: grouped, matrix };
};

/**
 * Replace the full set of permissions granted to a role (matrix save).
 * System role 4 is rejected (it bypasses checks; granting is meaningless).
 */
const setRolePermissions = async (roleId, permKeys, actorUuid) => {
  const id = Number(roleId);
  const [rows] = await pool.query('SELECT id, is_system FROM roles WHERE id = ?', [id]);
  if (rows.length === 0) {
    return { success: false, status: 404, message: 'Role not found' };
  }
  if (id === ROLE_SUPER_ADMIN) {
    return { success: false, status: 400, message: 'Super admin already holds all permissions implicitly' };
  }

  const keys = Array.isArray(permKeys) ? permKeys : [];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    if (keys.length > 0) {
      // Resolve keys -> ids, ignoring any unknown keys.
      const [perms] = await connection.query(
        'SELECT id, perm_key FROM permissions WHERE perm_key IN (?)',
        [keys]
      );
      if (perms.length > 0) {
        const values = perms.map((p) => [id, p.id, actorUuid]);
        await connection.query(
          'INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES ?',
          [values]
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  bustPermissionCache(id);
  await writeAudit({
    actorUuid,
    action: 'role.perm.set',
    targetType: 'role',
    targetId: id,
    detail: { permKeys: keys }
  });
  return { success: true, message: 'Permissions updated successfully' };
};

// --------------------------------------------------- User role assignment

/**
 * List users for the assignment tab, with their current role label.
 */
const getUsers = async (filters = {}) => {
  const { roleId, search = '', page = 1, limit = 20 } = filters;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const where = ['(u.is_deleted IS NULL OR u.is_deleted = 0)'];
  const params = [];
  if (roleId !== undefined && roleId !== null && roleId !== '') {
    where.push('u.role_id = ?');
    params.push(Number(roleId));
  }
  if (search && search.trim() !== '') {
    where.push('(profile.first_name LIKE ? OR profile.last_name LIKE ? OR u.email LIKE ?)');
    const t = `%${search.trim()}%`;
    params.push(t, t, t);
  }
  const whereClause = where.join(' AND ');

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM users u
       LEFT JOIN (
         SELECT user_id, first_name, last_name FROM students
         UNION ALL SELECT user_id, first_name, last_name FROM instructors
         UNION ALL SELECT user_id, first_name, last_name FROM admins
       ) profile ON u.uuid = profile.user_id
      WHERE ${whereClause}`,
    params
  );
  const total = countRows[0]?.n || 0;

  const [users] = await pool.query(
    `SELECT
        u.uuid                AS uuid,
        profile.first_name    AS firstName,
        profile.last_name     AS lastName,
        u.email               AS email,
        u.role_id             AS roleId,
        r.label               AS roleLabel,
        u.status              AS status
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN (
       SELECT user_id, first_name, last_name FROM students
       UNION ALL SELECT user_id, first_name, last_name FROM instructors
       UNION ALL SELECT user_id, first_name, last_name FROM admins
     ) profile ON u.uuid = profile.user_id
     WHERE ${whereClause}
     ORDER BY profile.first_name, profile.last_name, u.email
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  return {
    users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  };
};

/**
 * Assign a role to a user. Guards:
 *  - target role must exist and be active
 *  - cannot grant super admin (role 4) via this API
 *  - cannot downgrade the LAST remaining super admin
 */
const assignUserRole = async (uuid, roleId, actorUuid) => {
  const newRoleId = Number(roleId);

  if (newRoleId === ROLE_SUPER_ADMIN) {
    return { success: false, status: 403, message: 'Super admin cannot be granted through this interface' };
  }

  const [roleRows] = await pool.query('SELECT id, is_active FROM roles WHERE id = ?', [newRoleId]);
  if (roleRows.length === 0) {
    return { success: false, status: 404, message: 'Target role not found' };
  }
  if (!roleRows[0].is_active) {
    return { success: false, status: 400, message: 'Target role is inactive' };
  }

  const [userRows] = await pool.query(
    'SELECT uuid, role_id FROM users WHERE uuid = ? AND (is_deleted IS NULL OR is_deleted = 0)',
    [uuid]
  );
  if (userRows.length === 0) {
    return { success: false, status: 404, message: 'User not found' };
  }
  const currentRoleId = userRows[0].role_id;

  // Protect the last super admin: if this user is currently super admin and is
  // being moved off it, ensure at least one other super admin remains.
  if (currentRoleId === ROLE_SUPER_ADMIN && newRoleId !== ROLE_SUPER_ADMIN) {
    const [saCount] = await pool.query(
      'SELECT COUNT(*) AS n FROM users WHERE role_id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
      [ROLE_SUPER_ADMIN]
    );
    if (saCount[0].n <= 1) {
      return { success: false, status: 409, message: 'Cannot downgrade the last super admin' };
    }
  }

  await pool.query('UPDATE users SET role_id = ? WHERE uuid = ?', [newRoleId, uuid]);

  await writeAudit({
    actorUuid,
    action: 'user.role.assign',
    targetType: 'user',
    targetId: uuid,
    detail: { from: currentRoleId, to: newRoleId }
  });
  return { success: true, message: 'Role assigned successfully' };
};

// ----------------------------------------------------------- Audit log

const getAuditLog = async (filters = {}) => {
  const { limit = 50 } = filters;
  const [rows] = await pool.query(
    `SELECT id, actor_uuid AS actorUuid, action, target_type AS targetType,
            target_id AS targetId, detail_json AS detail, created_at AS createdAt
       FROM permission_audit_log
      ORDER BY created_at DESC
      LIMIT ?`,
    [parseInt(limit)]
  );
  return rows;
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  getMatrix,
  setRolePermissions,
  getUsers,
  assignUserRole,
  getAuditLog
};
