const dashboardService = require('../../services/super_admin/dashboard_service');

/**
 * Super Admin Dashboard Controller
 * Handles all HTTP requests for super admin dashboard endpoints
 */

/**
 * Get dashboard statistics
 * GET /api/super-admin/dashboard/stats
 */
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await dashboardService.getStats(
      startDate || null,
      endDate || null
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Super Admin Dashboard Controller - getStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get top courses by enrollment
 * GET /api/super-admin/dashboard/top-courses
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
    console.error('Super Admin Dashboard Controller - getTopCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top courses',
      error: error.message
    });
  }
};

/**
 * Get super admin tasks
 * GET /api/super-admin/dashboard/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const superAdminId = req.user?.userId || null;

    const tasks = await dashboardService.getTasks(
      superAdminId,
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 10
    );

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Super Admin Dashboard Controller - getTasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

/**
 * Get learning hours trend for chart
 * GET /api/super-admin/dashboard/learning-hours
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
    console.error('Super Admin Dashboard Controller - getLearningHours error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning hours',
      error: error.message
    });
  }
};

/**
 * Get learning progress for current month
 * GET /api/super-admin/dashboard/learning-progress
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
    console.error('Super Admin Dashboard Controller - getLearningProgress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning progress',
      error: error.message
    });
  }
};

/**
 * Perform action on a task
 * POST /api/super-admin/dashboard/tasks/:taskId/action
 */
exports.performTaskAction = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action } = req.body;
    const superAdminId = req.user?.userId || null;

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
      superAdminId
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
    console.error('Super Admin Dashboard Controller - performTaskAction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform task action',
      error: error.message
    });
  }
};

/**
 * Get a single task by ID
 * GET /api/super-admin/dashboard/tasks/:taskId
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
    console.error('Super Admin Dashboard Controller - getTaskById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
};
