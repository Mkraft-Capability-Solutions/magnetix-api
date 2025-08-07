const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const InstructorMentorshipController = require('../../controllers/instructor/mentorship_controller');
const rateLimit = require('express-rate-limit');

const mentorshipLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many attempts, please try again later'
});

router.get('/requests', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.getMentorshipRequests);
router.post('/requests/approve', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.approveMentorshipRequest);
router.post('/requests/reject', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.rejectMentorshipRequest);
router.get('/mentees', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.getAllMentees);
router.get('/session-requests', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.getScheduleSessionRequests);
router.post('/session-requests/approve', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.approveSessionRequest);
router.post('/session-requests/reject', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.rejectSessionRequest);
router.get('/sessions/upcoming', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.getUpcomingScheduleSessions);
router.get('/sessions/past', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.getPastScheduleSessions);
router.post('/sessions/schedule', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.scheduleSession);
router.put('/sessions/update', authenticate, authorize(2), mentorshipLimiter, InstructorMentorshipController.updateScheduledSession);

module.exports = router;