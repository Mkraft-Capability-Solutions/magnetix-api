const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboard_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

/**
 * POST /api/admin/dashboard/stats/calculate
 * Calculate and save daily dashboard statistics
 * This endpoint should be called daily (via cron job or manually)
 */
router.post('/stats/calculate', dashboardController.calculateDailyStats);

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics for a specific date
 * Query params: date (YYYY-MM-DD format, defaults to today)
 */
router.get('/stats', dashboardController.getStats);

/**
 * GET /api/admin/dashboard/top-courses
 * Get top courses by enrollment
 * Query params: startDate, endDate, limit
 */
router.get('/top-courses', dashboardController.getTopCourses);

/**
 * GET /api/admin/dashboard/tasks
 * Get admin tasks
 * Query params: startDate, endDate, limit
 */
router.get('/tasks', dashboardController.getTasks);

/**
 * GET /api/admin/dashboard/tasks/:taskId
 * Get a single task by ID
 */
router.get('/tasks/:taskId', dashboardController.getTaskById);

/**
 * POST /api/admin/dashboard/tasks/:taskId/action
 * Perform action on a task (approve, reject, remind)
 * Body: { action: 'approve' | 'reject' | 'remind' }
 */
router.post('/tasks/:taskId/action', dashboardController.performTaskAction);

/**
 * GET /api/admin/dashboard/learning-hours
 * Get learning hours trend for chart
 * Query params: startDate, endDate
 */
router.get('/learning-hours', dashboardController.getLearningHours);

/**
 * GET /api/admin/dashboard/learning-progress
 * Get learning progress for current month
 * Query params: startDate, endDate
 */
router.get('/learning-progress', dashboardController.getLearningProgress);

module.exports = router;
