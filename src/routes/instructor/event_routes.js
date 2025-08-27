// instructor_event_routes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const instructorEventController = require('../../controllers/instructor/event_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Configure multer for handling multipart/form-data
const upload = multer();

router.use(authenticate);
router.use(authorize(2)); 

// Events - specific routes must come before parameterized routes
router.post('/', upload.none(), instructorEventController.createEvent);
router.put('/', upload.none(), instructorEventController.updateEvent);
router.delete('/', instructorEventController.deleteEvent);
router.get('/upcoming', instructorEventController.getMyUpcomingEvents);
router.get('/past', instructorEventController.getMyPastEvents);
router.get('/:eventId', instructorEventController.getEventById);
router.get('/:eventId/attendees', instructorEventController.getEventAttendees);

module.exports = router;