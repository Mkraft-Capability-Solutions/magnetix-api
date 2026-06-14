const rbacService = require('../../services/super_admin/rbac_service');

/**
 * RBAC Controller — roles, permission catalog, matrix, user role assignment.
 * All routes are super-admin gated (role 4) at the router level.
 */

const sendServiceResult = (res, result, okStatus = 200) => {
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  return res.status(okStatus).json(result);
};

const getRoles = async (req, res, next) => {
  try {
    const roles = await rbacService.getRoles();
    res.status(200).json({ success: true, data: roles });
  } catch (error) { next(error); }
};

const createRole = async (req, res, next) => {
  try {
    const result = await rbacService.createRole(req.body || {}, req.user.uuid);
    sendServiceResult(res, result, 201);
  } catch (error) { next(error); }
};

const updateRole = async (req, res, next) => {
  try {
    const result = await rbacService.updateRole(req.params.id, req.body || {}, req.user.uuid);
    sendServiceResult(res, result);
  } catch (error) { next(error); }
};

const deleteRole = async (req, res, next) => {
  try {
    const result = await rbacService.deleteRole(req.params.id, req.user.uuid);
    sendServiceResult(res, result);
  } catch (error) { next(error); }
};

const getPermissions = async (req, res, next) => {
  try {
    const data = await rbacService.getPermissions();
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const getMatrix = async (req, res, next) => {
  try {
    const data = await rbacService.getMatrix();
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const setRolePermissions = async (req, res, next) => {
  try {
    const { permKeys } = req.body || {};
    const result = await rbacService.setRolePermissions(req.params.id, permKeys, req.user.uuid);
    sendServiceResult(res, result);
  } catch (error) { next(error); }
};

const getUsers = async (req, res, next) => {
  try {
    const { roleId, search, page, limit } = req.query;
    const result = await rbacService.getUsers({ roleId, search, page, limit });
    res.status(200).json({ success: true, data: result.users, pagination: result.pagination });
  } catch (error) { next(error); }
};

const assignUserRole = async (req, res, next) => {
  try {
    const { roleId } = req.body || {};
    if (roleId === undefined || roleId === null) {
      return res.status(400).json({ success: false, message: 'roleId is required' });
    }
    const result = await rbacService.assignUserRole(req.params.uuid, roleId, req.user.uuid);
    sendServiceResult(res, result);
  } catch (error) { next(error); }
};

const getAuditLog = async (req, res, next) => {
  try {
    const rows = await rbacService.getAuditLog({ limit: req.query.limit });
    res.status(200).json({ success: true, data: rows });
  } catch (error) { next(error); }
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
