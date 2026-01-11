const dashboardService = require('../../services/instructor/dashboard_service');

/**
 * Instructor Dashboard Controller
 * Handles all HTTP requests for instructor dashboard endpoints
 */

/**
 * Get dashboard statistics
 * GET /api/instructor/dashboard/stats
 */
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const stats = await dashboardService.getStats(
      instructorId,
      startDate || null,
      endDate || null
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Instructor Dashboard Controller - getStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get top courses by enrollment
 * GET /api/instructor/dashboard/top-courses
 */
exports.getTopCourses = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const courses = await dashboardService.getTopCourses(
      instructorId,
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 5
    );

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Instructor Dashboard Controller - getTopCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top courses',
      error: error.message
    });
  }
};

/**
 * Get instructor tasks
 * GET /api/instructor/dashboard/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const tasks = await dashboardService.getTasks(
      instructorId,
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 10
    );

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Instructor Dashboard Controller - getTasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

/**
 * Get learning hours trend for chart
 * GET /api/instructor/dashboard/learning-hours
 */
exports.getLearningHours = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const hours = await dashboardService.getLearningHours(
      instructorId,
      startDate || null,
      endDate || null
    );

    res.json({
      success: true,
      data: hours
    });
  } catch (error) {
    console.error('Instructor Dashboard Controller - getLearningHours error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning hours',
      error: error.message
    });
  }
};

/**
 * Get learning progress for current month
 * GET /api/instructor/dashboard/learning-progress
 */
exports.getLearningProgress = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const progress = await dashboardService.getLearningProgress(
      instructorId,
      startDate || null,
      endDate || null
    );

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Instructor Dashboard Controller - getLearningProgress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning progress',
      error: error.message
    });
  }
};

/**
 * Perform action on a task
 * POST /api/instructor/dashboard/tasks/:taskId/action
 */
exports.performTaskAction = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action } = req.body;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required (approve, reject, remind, or complete)'
      });
    }

    const result = await dashboardService.performTaskAction(
      parseInt(taskId),
      action,
      instructorId
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
    console.error('Instructor Dashboard Controller - performTaskAction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform task action',
      error: error.message
    });
  }
};

/**
 * Get a single task by ID
 * GET /api/instructor/dashboard/tasks/:taskId
 */
exports.getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    const task = await dashboardService.getTaskById(parseInt(taskId), instructorId);

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
    console.error('Instructor Dashboard Controller - getTaskById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
};

/**
 * Get student performance overview
 * GET /api/instructor/dashboard/student-performance
 */
exports.getStudentPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const performance = await dashboardService.getStudentPerformance(
      instructorId,
      startDate || null,
      endDate || null
    );

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Instructor Dashboard Controller - getStudentPerformance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student performance',
      error: error.message
    });
  }
};
