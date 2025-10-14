const express = require('express');
const router = express.Router();
const instructorAvailabilityController = require('../../controllers/instructor/availability_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and authorization middleware
// All routes require authentication and student role (role_id = 3)
router.use(authenticate);
router.use(authorize(3));

// GET /api/student/instructor-availability/:instructorUuid - Get instructor availability by UUID
router.get('/:instructorUuid', instructorAvailabilityController.getInstructorAvailabilityByUuid);

module.exports = router;
