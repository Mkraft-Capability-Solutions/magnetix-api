// instructor_event_routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const instructorEventController = require('../../controllers/instructor/event_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for event thumbnails
  }
});

router.use(authenticate);
router.use(authorize(2)); 

// Events
router.post('/', upload.single('eventThumbnail'), instructorEventController.createEvent);
router.put('/', instructorEventController.updateEvent);
router.delete('/', instructorEventController.deleteEvent);
router.get('/upcoming', instructorEventController.getMyUpcomingEvents);
router.get('/past', instructorEventController.getMyPastEvents);
router.get('/:eventId/attendees', instructorEventController.getEventAttendees);

module.exports = router;