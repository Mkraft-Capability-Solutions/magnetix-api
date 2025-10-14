const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const mentorshipController = require('../../controllers/student/mentorship_controller');

router.get('/mentors', authenticate, authorize(1), mentorshipController.getAssignedMentors);
router.get('/available-mentors', authenticate, authorize(1), mentorshipController.findAvailableMentors);
router.get('/featured-mentors', authenticate, authorize(1), mentorshipController.getFeaturedMentors);
router.post('/:mentorId/request', authenticate, authorize(1), mentorshipController.requestMentorship);
router.get('/upcoming-sessions', authenticate, authorize(1), mentorshipController.getUpcomingSessions);
router.get('/past-sessions', authenticate, authorize(1), mentorshipController.getPastSessions);
router.post('/schedule-session', authenticate, authorize(1), mentorshipController.requestScheduleSession);
router.post('/schedule-session', authenticate, authorize(1), mentorshipController.requestScheduleSession);
router.get( '/is-request-deleted',  authenticate,  authorize(1), mentorshipController.isMentorshipRequestDeleted);
router.get('/:mentorId/details', authenticate, authorize(1), mentorshipController.getMentorDetails);
router.get('/:mentorId/status', authenticate, authorize(1), mentorshipController.getMentorshipStatus);

module.exports = router;