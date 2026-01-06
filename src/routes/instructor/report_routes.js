const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/instructor/report_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and instructor authorization to all routes
router.use(authenticate);
router.use(authorize(2)); // Role 2 = Instructor

/**
 * GET /api/instructor/reports/leaderboard
 * Get leaderboard data - top performers in instructor's courses
 * Query params: limit (default 50)
 */
router.get('/leaderboard', reportController.getLeaderboard);

/**
 * GET /api/instructor/reports/department-performance
 * Get department performance data for instructor's students
 */
router.get('/department-performance', reportController.getDepartmentPerformance);

/**
 * GET /api/instructor/reports/completion-trends
 * Get completion trends data for instructor's courses (last 6 months)
 */
router.get('/completion-trends', reportController.getCompletionTrends);

/**
 * GET /api/instructor/reports/certification-distribution
 * Get certification distribution data for instructor's courses
 */
router.get('/certification-distribution', reportController.getCertificationDistribution);

/**
 * GET /api/instructor/reports/skills-assessment
 * Get skills assessment data for instructor's courses
 */
router.get('/skills-assessment', reportController.getSkillsAssessment);

/**
 * POST /api/instructor/reports/generate
 * Generate a report file for instructor
 * Body: { reportType, format, dateRange, department }
 */
router.post('/generate', reportController.generateReport);

/**
 * GET /api/instructor/reports/download/:fileName
 * Download a generated report file
 */
router.get('/download/:fileName', reportController.downloadReport);

module.exports = router;
