const express = require('express');
const router = express.Router();
const meetController = require('../../controllers/google/meet_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

/**
 * Google Meet Routes
 * 
 * All endpoints require authentication
 * Available for Students (1), Instructors (2), and Admins (3)
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /google/meet/quick
 * @desc    Generate a quick Google Meet link
 * @access  Student, Instructor, Admin
 * @body    { title?: string, description?: string }
 * @returns { meetLink, eventId, htmlLink, conferenceId, mode, note }
 */
router.post('/quick', authorize(1, 2, 3), meetController.generateQuickMeetLink);

/**
 * @route   POST /google/meet/create
 * @desc    Create a Google Meet link with details
 * @access  Student, Instructor, Admin
 * @body    { title?: string, description?: string, startTime?: string, endTime?: string, attendees?: string[] }
 * @returns { meetLink, eventId, htmlLink, conferenceId, mode, note }
 */
router.post('/create', authorize(1, 2, 3), meetController.createMeetLink);

/**
 * @route   GET /google/meet/health
 * @desc    Health check for Meet service
 * @access  Public
 * @returns { status, mode, timestamp, capabilities }
 */
router.get('/health', meetController.healthCheck);

/**
 * @route   GET /google/meet/info
 * @desc    Get service information
 * @access  Public
 * @returns { service, version, description, features, endpoints }
 */
router.get('/info', meetController.getServiceInfo);

module.exports = router;