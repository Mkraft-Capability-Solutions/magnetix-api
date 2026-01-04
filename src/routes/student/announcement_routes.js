const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const announcementController = require('../../controllers/student/announcement_controller');

/**
 * Get announcements for authenticated student
 * GET /api/student/announcements
 */
router.get('/', authenticate, authorize(1), announcementController.getAnnouncements);

module.exports = router;
