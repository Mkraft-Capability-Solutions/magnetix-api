const express = require('express');
const router = express.Router();
const organizationController = require('../../controllers/super_admin/organization_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and super admin role
router.use(authenticate);
router.use(authorize(4)); // Only Super Admins can manage user-organization assignments

// User-Organization assignment routes
router.post('/:userId/organizations/:organizationId', organizationController.assignUserToOrganization);
router.delete('/:userId/organizations/:organizationId', organizationController.removeUserFromOrganization);
router.get('/:userId/organizations', organizationController.getUserOrganizations);

module.exports = router;
