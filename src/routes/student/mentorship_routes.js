const express = require('express');
const router = express.Router();
const mentorshipController = require('../../controllers/student/mentorship_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and student role
router.use(authenticate);
router.use(authorize(1));

// Mentorship routes
router.get('/my-mentors', mentorshipController.getYourMentor);
router.get('/available-mentors', mentorshipController.findYourMentors);
router.post('/request', mentorshipController.requestMentorship);

module.exports = router;