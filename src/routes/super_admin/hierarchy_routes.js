const express = require('express');
const router = express.Router();
const hierarchyController = require('../../controllers/super_admin/hierarchy_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const { requirePermission } = require('../../middleware/permission_middleware');

router.use(authenticate);
router.use(authorize(4));

router.get('/tree', requirePermission('users.hierarchy.view'), hierarchyController.getTree);
router.get('/search', requirePermission('users.hierarchy.view'), hierarchyController.searchUsers);
router.get('/user/:uuid', requirePermission('users.hierarchy.view'), hierarchyController.getUserNode);
router.patch('/user/:uuid/manager', requirePermission('users.hierarchy.manage'), hierarchyController.reassignManager);

module.exports = router;
