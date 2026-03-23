const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/admin/report_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

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
 * GET /api/admin/reports/login-activity
 * Get daily active users over the past 30 days
 */
router.get('/login-activity', reportController.getLoginActivity);

/**
 * GET /api/admin/reports/enrollment-timeline
 * Get weekly enrollment timeline over past 6 months
 */
router.get('/enrollment-timeline', reportController.getEnrollmentTimeline);

/**
 * GET /api/admin/reports/category-breakdown
 * Get course enrollment breakdown by category
 */
router.get('/category-breakdown', reportController.getCategoryBreakdown);

/**
 * GET /api/admin/reports/progress-distribution
 * Get learner progress distribution across courses
 */
router.get('/progress-distribution', reportController.getProgressDistribution);

/**
 * GET /api/admin/reports/user-growth
 * Get user growth trend over past 12 months
 */
router.get('/user-growth', reportController.getUserGrowth);

/**
 * GET /api/admin/reports/role-distribution
 * Get user count by role
 */
router.get('/role-distribution', reportController.getRoleDistribution);

/**
 * GET /api/admin/reports/activity-heatmap
 * Get user activity heatmap data (day of week x hour)
 */
router.get('/activity-heatmap', reportController.getActivityHeatmap);

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
