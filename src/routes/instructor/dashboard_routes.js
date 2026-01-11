const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/instructor/dashboard_controller');
const debugController = require('../../controllers/instructor/dashboard_debug_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and instructor authorization to all routes
router.use(authenticate);
router.use(authorize(2)); // Role 2 = Instructor

/**
 * GET /api/instructor/dashboard/stats
 * Get dashboard statistics
 * Query params: startDate, endDate
 */
router.get('/stats', dashboardController.getStats);

/**
 * GET /api/instructor/dashboard/top-courses
 * Get top courses by enrollment
 * Query params: startDate, endDate, limit
 */
router.get('/top-courses', dashboardController.getTopCourses);

/**
 * GET /api/instructor/dashboard/tasks
 * Get instructor tasks
 * Query params: startDate, endDate, limit
 */
router.get('/tasks', dashboardController.getTasks);

/**
 * GET /api/instructor/dashboard/tasks/:taskId
 * Get a single task by ID
 */
router.get('/tasks/:taskId', dashboardController.getTaskById);

/**
 * POST /api/instructor/dashboard/tasks/:taskId/action
 * Perform action on a task (approve, reject, remind, complete)
 * Body: { action: 'approve' | 'reject' | 'remind' | 'complete' }
 */
router.post('/tasks/:taskId/action', dashboardController.performTaskAction);

/**
 * GET /api/instructor/dashboard/learning-hours
 * Get learning hours trend for chart
 * Query params: startDate, endDate
 */
router.get('/learning-hours', dashboardController.getLearningHours);

/**
 * GET /api/instructor/dashboard/learning-progress
 * Get learning progress for current month
 * Query params: startDate, endDate
 */
router.get('/learning-progress', dashboardController.getLearningProgress);

/**
 * GET /api/instructor/dashboard/student-performance
 * Get student performance overview
 * Query params: startDate, endDate
 */
router.get('/student-performance', dashboardController.getStudentPerformance);

/**
 * DEBUG ENDPOINTS
 * For troubleshooting dashboard data issues
 */

/**
 * GET /api/instructor/dashboard/debug
 * Get comprehensive debug information about instructor's data
 */
router.get('/debug', debugController.getDebugInfo);

/**
 * GET /api/instructor/dashboard/debug/connection
 * Test database connection
 */
router.get('/debug/connection', debugController.testConnection);

/**
 * GET /api/instructor/dashboard/debug/tables
 * Get count of rows in all relevant tables
 */
router.get('/debug/tables', debugController.getTableCounts);

module.exports = router;
