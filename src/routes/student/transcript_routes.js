const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const transcriptController = require('../../controllers/student/transcript_controller');

/**
 * Get transcript statistics for authenticated student
 * GET /api/student/transcript/stats
 */
router.get('/stats', authenticate, authorize(1), transcriptController.getTranscriptStats);

/**
 * Get transcript courses for authenticated student
 * GET /api/student/transcript/courses
 */
router.get('/courses', authenticate, authorize(1), transcriptController.getTranscriptCourses);

/**
 * Get analytics statistics for authenticated student
 * GET /api/student/transcript/analytics-statistics
 */
router.get('/analytics-statistics', authenticate, authorize(1), transcriptController.getAnalyticsStatistics);

/**
 * Get monthly comparison for authenticated student
 * GET /api/student/transcript/monthly-comparison
 */
router.get('/monthly-comparison', authenticate, authorize(1), transcriptController.getMonthlyComparison);

module.exports = router;
