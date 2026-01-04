const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/admin/report_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(3)); // Role 3 = Admin

/**
 * GET /api/admin/reports/leaderboard
 * Get leaderboard data - top performers
 * Query params: limit (default 50)
 */
router.get('/leaderboard', reportController.getLeaderboard);

/**
 * GET /api/admin/reports/department-performance
 * Get department performance data
 */
router.get('/department-performance', reportController.getDepartmentPerformance);

/**
 * GET /api/admin/reports/completion-trends
 * Get completion trends data (last 6 months)
 */
router.get('/completion-trends', reportController.getCompletionTrends);

/**
 * GET /api/admin/reports/certification-distribution
 * Get certification distribution data
 */
router.get('/certification-distribution', reportController.getCertificationDistribution);

/**
 * GET /api/admin/reports/skills-assessment
 * Get skills assessment data
 */
router.get('/skills-assessment', reportController.getSkillsAssessment);

/**
 * GET /api/admin/reports/analytics
 * Get all dashboard analytics data in one call
 */
router.get('/analytics', reportController.getAnalytics);

/**
 * GET /api/admin/reports/user-data
 * Get user report preview data
 * Query params: fromDate, toDate, department
 */
router.get('/user-data', reportController.getUserReportData);

/**
 * GET /api/admin/reports/course-completion-data
 * Get course completion report preview data
 * Query params: fromDate, toDate
 */
router.get('/course-completion-data', reportController.getCourseCompletionData);

/**
 * GET /api/admin/reports/learning-engagement-data
 * Get learning engagement report preview data
 * Query params: fromDate, toDate
 */
router.get('/learning-engagement-data', reportController.getLearningEngagementData);

/**
 * POST /api/admin/reports/generate
 * Generate a report file
 * Body: { reportType, format, dateRange, department }
 */
router.post('/generate', reportController.generateReport);

/**
 * GET /api/admin/reports/download/:fileName
 * Download a generated report file
 */
router.get('/download/:fileName', reportController.downloadReport);

module.exports = router;
