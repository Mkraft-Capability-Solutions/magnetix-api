const express = require('express');
const router = express.Router();
const multer = require('multer');
const organizationController = require('../../controllers/super_admin/organization_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication and super admin role (role_id = 4)
router.use(authenticate);
router.use(authorize(4)); // Only Super Admins can manage organizations

// Bulk upload route (must be before /:id routes)
router.post('/bulk-upload', upload.single('file'), organizationController.uploadOrganizations);

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
