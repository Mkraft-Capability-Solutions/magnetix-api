const express = require('express');
const router = express.Router();
const instructorAvailabilityController = require('../../controllers/instructor/availability_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and authorization middleware
// All routes require authentication and instructor role (role_id = 2)
router.use(authenticate);
router.use(authorize(2));

// GET /api/instructor/availability - Get instructor availability
router.get('/availability', instructorAvailabilityController.getAvailability);

// PUT /api/instructor/availability - Update instructor availability
router.put('/availability', instructorAvailabilityController.updateAvailability);

// POST /api/instructor/set-unavailable - Mark instructor as unavailable
router.post('/set-unavailable', instructorAvailabilityController.setUnavailable);

module.exports = router;
