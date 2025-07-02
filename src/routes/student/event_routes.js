const express = require('express');
const router = express.Router();
const eventController = require('../../controllers/student/event_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and student role
router.use(authenticate);
router.use(authorize(1));

// Event routes
router.get('/upcoming', eventController.getAllUpcomingEvents);
router.get('/registered', eventController.getUpcomingRegisteredEvents);
router.get('/past', eventController.getPastEvents);
router.post('/register', eventController.registerForEvent);

module.exports = router;