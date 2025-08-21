// instructor_event_routes.js
const express = require('express');
const router = express.Router();
const instructorEventController = require('../../controllers/instructor/event_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

router.use(authenticate);
router.use(authorize(2)); 

// Events - specific routes must come before parameterized routes
router.post('/', instructorEventController.createEvent);
router.put('/', instructorEventController.updateEvent);
router.delete('/', instructorEventController.deleteEvent);
router.get('/upcoming', instructorEventController.getMyUpcomingEvents);
router.get('/past', instructorEventController.getMyPastEvents);
router.get('/:eventId', instructorEventController.getEventById);
router.get('/:eventId/attendees', instructorEventController.getEventAttendees);

module.exports = router;