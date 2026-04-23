const express = require('express');
const router = express.Router();
const organizationController = require('../../controllers/admin/organization_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and admin role (role_id = 3)
router.use(authenticate);
router.use(authorize(3)); // Only admins can manage organizations

// Organization CRUD routes
router.get('/', organizationController.getAllOrganizations);
router.get('/:id', organizationController.getOrganizationById);
router.post('/', organizationController.createOrganization);
router.put('/:id', organizationController.updateOrganization);
router.delete('/:id', organizationController.deleteOrganization);

// Organization status toggle
router.patch('/:id/toggle-status', organizationController.toggleOrganizationStatus);

// Get users in an organization
router.get('/:id/users', organizationController.getOrganizationUsers);

module.exports = router;
