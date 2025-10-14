const express = require('express');
const router = express.Router();
const instructorProfileController = require('../../controllers/instructor/instructor_profile_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication
router.use(authenticate);

// Instructor-only routes (role_id = 2)
router.use(authorize(2));

/**
 * @route GET /instructor/profile
 * @desc Get own complete profile
 * @access Protected (Instructor only)
 */
router.get('/profile', instructorProfileController.getOwnProfile);

/**
 * @route PUT /instructor/profile/experience
 * @desc Update own experience
 * @access Protected (Instructor only)
 */
router.put('/profile/experience', instructorProfileController.updateExperience);

module.exports = router;
