const express = require('express');
const router = express.Router();
const meetController = require('../../controllers/google/meet_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

/**
 * Google Meet Routes
 *
 * All routes require authentication.
 * Instructors and Admins can create Meet links.
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /google/meet/quick
 * @desc    Generate a quick Google Meet link
 * @access  Instructor, Admin
 * @body    { title?: string }
 */
router.post('/quick', authorize(1, 2, 3, 4), meetController.generateQuickMeetLink);

/**
 * @route   POST /google/meet/create
 * @desc    Create a Google Meet link with full event details
 * @access  Instructor, Admin
 * @body    { title, description?, startDateTime, endDateTime, attendees?, timeZone? }
 */
router.post('/create', authorize(1, 2, 3, 4), meetController.createMeetLink);

/**
 * @route   PATCH /google/meet/:eventId
 * @desc    Update an existing Google Meet event
 * @access  Instructor, Admin
 * @body    { title?, description?, startDateTime?, endDateTime? }
 */
router.patch('/:eventId', authorize(1, 2, 3, 4), meetController.updateMeetEvent);

/**
 * @route   DELETE /google/meet/:eventId
 * @desc    Delete a Google Meet event
 * @access  Instructor, Admin
 */
router.delete('/:eventId', authorize(1, 2, 3, 4), meetController.deleteMeetEvent);

/**
 * @route   GET /google/meet/auth-url
 * @desc    Get OAuth authorization URL (admin only)
 * @access  Admin, Super Admin
 */
router.get('/auth-url', authorize(3, 4), meetController.getAuthUrl);

module.exports = router;
