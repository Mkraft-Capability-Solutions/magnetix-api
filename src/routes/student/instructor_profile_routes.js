const express = require('express');
const router = express.Router();
const instructorProfileController = require('../../controllers/instructor/instructor_profile_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication
router.use(authenticate);

// Student-only routes (role_id = 3)
router.use(authorize(3));

/**
 * @route GET /student/instructor-profile/:instructorUuid
 * @desc Get complete instructor profile (for students viewing mentors)
 * @access Protected (Student only)
 */
router.get('/:instructorUuid', instructorProfileController.getCompleteProfile);

/**
 * @route GET /student/instructor-profile/basic/:instructorUuid
 * @desc Get basic instructor info
 * @access Protected (Student only)
 */
router.get('/basic/:instructorUuid', instructorProfileController.getBasicInfo);

module.exports = router;
