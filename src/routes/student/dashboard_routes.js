const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const dashboardController = require('../../controllers/student/dashboard_controller');

/**
 * Get dashboard statistics for authenticated student
 * GET /api/student/dashboard/stats
 */
router.get('/stats', authenticate, authorize(1), dashboardController.getDashboardStats);

module.exports = router;
