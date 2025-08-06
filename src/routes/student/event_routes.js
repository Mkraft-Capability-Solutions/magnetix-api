const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const eventController = require('../../controllers/student/event_controller');

router.get('/upcoming', authenticate, authorize(1), eventController.getAllUpcomingEvents);
router.get('/registered/upcoming', authenticate, authorize(1), eventController.getUpcomingRegisteredEvents);
router.get('/past', authenticate, authorize(1), eventController.getPastEvents);
router.post('/register', authenticate, authorize(1), eventController.registerForEvent);

module.exports = router;