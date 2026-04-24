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
    const adminId = req.user?.uuid || req.user?.userId || null;

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
    const adminId = req.user?.uuid || req.user?.userId || null;

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

/**
 * Get organizations that the admin belongs to
 * GET /api/admin/dashboard/organizations
 */
exports.getAdminOrganizations = async (req, res) => {
  try {
    // Auth middleware stores user ID as 'uuid', not 'userId'
    const userId = req.user?.uuid || req.user?.userId;

    console.log('🔍 getAdminOrganizations - req.user:', req.user);
    console.log('🔍 getAdminOrganizations - userId (uuid):', userId);

    if (!userId) {
      console.error('❌ User not authenticated - userId/uuid is missing');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const organizations = await dashboardService.getAdminOrganizations(userId);

    console.log('✅ Organizations fetched:', organizations.length, 'organizations');
    console.log('📊 Organizations:', JSON.stringify(organizations, null, 2));

    res.json({
      success: true,
      data: organizations
    });
  } catch (error) {
    console.error('❌ Dashboard Controller - getAdminOrganizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations',
      error: error.message
    });
  }
};

/**
 * Get organization-specific dashboard statistics
 * GET /api/admin/dashboard/organization/:organizationId/stats
 */
exports.getOrganizationStats = async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const stats = await dashboardService.getOrganizationStats(parseInt(organizationId));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard Controller - getOrganizationStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization statistics',
      error: error.message
    });
  }
};

/**
 * Get all users in an organization
 * GET /api/admin/dashboard/organization/:organizationId/users
 */
exports.getOrganizationUsers = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { page, limit, search, roleFilter } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const result = await dashboardService.getOrganizationUsers(
      parseInt(organizationId),
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        search: search || '',
        roleFilter: roleFilter ? parseInt(roleFilter) : null
      }
    );

    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Dashboard Controller - getOrganizationUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization users',
      error: error.message
    });
  }
};
