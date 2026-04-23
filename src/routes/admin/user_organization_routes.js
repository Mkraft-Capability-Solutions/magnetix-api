const express = require('express');
const router = express.Router();
const organizationController = require('../../controllers/admin/organization_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(3));

// User-Organization assignment routes
router.post('/:userId/organizations/:organizationId', organizationController.assignUserToOrganization);
router.delete('/:userId/organizations/:organizationId', organizationController.removeUserFromOrganization);
router.get('/:userId/organizations', organizationController.getUserOrganizations);

module.exports = router;
