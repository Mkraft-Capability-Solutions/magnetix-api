const express = require('express');
const router = express.Router();
const instructorMentorshipController = require('../../controllers/instructor/mentorship_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

router.use(authenticate);
router.use(authorize(2)); 

// Mentorship requests
router.get('/mentorship-requests', instructorMentorshipController.getMentorshipRequests);
router.post('/approve-mentorship', instructorMentorshipController.approveMentorshipRequest);
router.post('/reject-mentorship', instructorMentorshipController.rejectMentorshipRequest);

// Mentees
router.get('/mentees', instructorMentorshipController.getAllMentees);

// Session requests
router.get('/session-requests', instructorMentorshipController.getScheduleSessionRequests);
router.post('/approve-session', instructorMentorshipController.approveSessionRequest);
router.post('/reject-session', instructorMentorshipController.rejectSessionRequest);

// Scheduled sessions
router.get('/upcoming-sessions', instructorMentorshipController.getUpcomingScheduleSessions);
router.get('/past-sessions', instructorMentorshipController.getPastScheduleSessions);
router.post('/schedule-session', instructorMentorshipController.scheduleSession);
router.put('/update-session', instructorMentorshipController.updateScheduledSession);

module.exports = router;