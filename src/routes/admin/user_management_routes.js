const express = require('express');
const router = express.Router();
const userManagementController = require('../../controllers/admin/user_management_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization
router.use(authenticate);
router.use(authorize(3));

// Static routes first (before /:id)
router.get('/stats', userManagementController.getUserStats);
router.get('/departments', userManagementController.getDepartments);
router.get('/deactivation-log', userManagementController.getDeactivationLog);
router.post('/bulk-import', userManagementController.bulkImportUsers);

// Main CRUD routes
router.get('/', userManagementController.getAllUsers);
router.post('/', userManagementController.createUser);

// Dynamic routes with :id
router.get('/:id', userManagementController.getUserById);
router.put('/:id', userManagementController.updateUser);
router.post('/:id/deactivate', userManagementController.deactivateUser);
router.post('/:id/reactivate', userManagementController.reactivateUser);

module.exports = router;
