const dashboardService = require('../../services/student/dashboard_service');

/**
 * Get dashboard stats for student
 * GET /api/student/dashboard/stats
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const response = await dashboardService.getDashboardStats(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};
