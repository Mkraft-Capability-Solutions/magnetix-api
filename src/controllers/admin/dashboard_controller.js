const dashboardService = require('../../services/admin/dashboard_service');

/**
 * Admin Dashboard Controller
 * Handles all HTTP requests for admin dashboard endpoints
 */

/**
 * Calculate and save daily dashboard statistics
 * POST /api/admin/dashboard/stats/calculate
 */
exports.calculateDailyStats = async (req, res) => {
  try {
    const result = await dashboardService.calculateAndSaveDailyStats();

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Dashboard Controller - calculateDailyStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate daily statistics',
      error: error.message
    });
  }
};

/**
 * Get dashboard statistics for a specific date
 * GET /api/admin/dashboard/stats?date=YYYY-MM-DD
 */
exports.getStats = async (req, res) => {
  try {
    const { date } = req.query;

    const stats = await dashboardService.getStats(date || null);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard Controller - getStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get top courses by enrollment
 * GET /api/admin/dashboard/top-courses
 */
exports.getTopCourses = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;

    const courses = await dashboardService.getTopCourses(
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 5
    );

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Dashboard Controller - getTopCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top courses',
      error: error.message
    });
  }
};

/**
 * Get admin tasks
 * GET /api/admin/dashboard/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const adminId = req.user?.userId || null;

    const tasks = await dashboardService.getTasks(
      adminId,
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 10
    );

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Dashboard Controller - getTasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

/**
 * Get learning hours trend for chart
 * GET /api/admin/dashboard/learning-hours
 */
exports.getLearningHours = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const hours = await dashboardService.getLearningHours(
      startDate || null,
      endDate || null
    );

    res.json({
      success: true,
      data: hours
    });
  } catch (error) {
    console.error('Dashboard Controller - getLearningHours error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning hours',
      error: error.message
    });
  }
};

/**
 * Get learning progress for current month
 * GET /api/admin/dashboard/learning-progress
 */
exports.getLearningProgress = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const progress = await dashboardService.getLearningProgress(
      startDate || null,
      endDate || null
    );

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Dashboard Controller - getLearningProgress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning progress',
      error: error.message
    });
  }
};

/**
 * Perform action on a task
 * POST /api/admin/dashboard/tasks/:taskId/action
 */
exports.performTaskAction = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action } = req.body;
    const adminId = req.user?.userId || null;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required (approve, reject, or remind)'
      });
    }

    const result = await dashboardService.performTaskAction(
      parseInt(taskId),
      action,
      adminId
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Dashboard Controller - performTaskAction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform task action',
      error: error.message
    });
  }
};

/**
 * Get a single task by ID
 * GET /api/admin/dashboard/tasks/:taskId
 */
exports.getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    const task = await dashboardService.getTaskById(parseInt(taskId));

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Dashboard Controller - getTaskById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
};
