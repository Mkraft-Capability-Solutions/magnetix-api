const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const InstructorEventController = require('../../controllers/instructor/event_controller');
const rateLimit = require('express-rate-limit');

const eventLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many attempts, please try again later'
});

router.post('/create', authenticate, authorize(2), eventLimiter, InstructorEventController.createEvent);
router.put('/update', authenticate, authorize(2), eventLimiter, InstructorEventController.updateEvent);
router.post('/delete', authenticate, authorize(2), eventLimiter, InstructorEventController.deleteEvent);
router.get('/upcoming', authenticate, authorize(2), eventLimiter, InstructorEventController.getMyUpcomingEvents);
router.get('/past', authenticate, authorize(2), eventLimiter, InstructorEventController.getMyPastEvents);
router.get('/attendees/:event_id', authenticate, authorize(2), eventLimiter, InstructorEventController.getEventAttendees);

module.exports = router;