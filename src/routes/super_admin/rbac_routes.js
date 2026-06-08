const express = require('express');
const router = express.Router();
const rbacController = require('../../controllers/super_admin/rbac_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const { requirePermission } = require('../../middleware/permission_middleware');

// All RBAC routes require an authenticated super admin (role 4). The
// requirePermission layer is additive — role 4 bypasses it, so these checks
// become meaningful only if a custom role is ever granted super-admin-like
// access (which the API forbids), but they document the permission model and
// keep the routes ready for finer delegation later.
router.use(authenticate);
router.use(authorize(4));

// Roles
router.get('/roles', requirePermission('security.roles.view'), rbacController.getRoles);
router.post('/roles', requirePermission('security.roles.manage'), rbacController.createRole);
router.put('/roles/:id', requirePermission('security.roles.manage'), rbacController.updateRole);
router.delete('/roles/:id', requirePermission('security.roles.manage'), rbacController.deleteRole);
router.put('/roles/:id/permissions', requirePermission('security.permissions.assign'), rbacController.setRolePermissions);

// Permission catalog + matrix
router.get('/permissions', requirePermission('security.roles.view'), rbacController.getPermissions);
router.get('/matrix', requirePermission('security.roles.view'), rbacController.getMatrix);

// User role assignment
router.get('/users', requirePermission('users.view'), rbacController.getUsers);
router.patch('/users/:uuid/role', requirePermission('security.permissions.assign'), rbacController.assignUserRole);

// Audit log
router.get('/audit-log', requirePermission('security.roles.view'), rbacController.getAuditLog);

module.exports = router;
