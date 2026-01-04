const userManagementService = require('../../services/admin/user_management_service');

/**
 * Get all users with filtering and pagination
 */
const getAllUsers = async (req, res) => {
  try {
    const { search, status, department, role, page = 1, limit = 10 } = req.query;

    const result = await userManagementService.getAllUsers({
      search,
      status,
      department,
      role,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('UserManagementController - getAllUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Get user statistics
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await userManagementService.getUserStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('UserManagementController - getUserStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

/**
 * Get single user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userManagementService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('UserManagementController - getUserById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

/**
 * Create a new user
 */
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, role, department, jobTitle } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const result = await userManagementService.createUser({
      firstName,
      lastName,
      email,
      role: role || 'student',
      department,
      jobTitle,
      instance: req.user?.instance || 'default'
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId,
        generatedPassword: result.generatedPassword
      }
    });
  } catch (error) {
    console.error('UserManagementController - createUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

/**
 * Update user
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, department, jobTitle, status } = req.body;

    const result = await userManagementService.updateUser(id, {
      firstName,
      lastName,
      department,
      jobTitle,
      status
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('UserManagementController - updateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * Deactivate user
 */
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const deactivatedBy = req.user.uuid;

    const result = await userManagementService.deactivateUser(id, deactivatedBy, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('UserManagementController - deactivateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
};

/**
 * Reactivate user
 */
const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const reactivatedBy = req.user.uuid;

    const result = await userManagementService.reactivateUser(id, reactivatedBy);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('UserManagementController - reactivateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate user',
      error: error.message
    });
  }
};

/**
 * Get deactivation log
 */
const getDeactivationLog = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await userManagementService.getDeactivationLog(
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('UserManagementController - getDeactivationLog error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deactivation log',
      error: error.message
    });
  }
};

/**
 * Get departments for filter dropdown
 */
const getDepartments = async (req, res) => {
  try {
    const departments = await userManagementService.getDepartments();

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('UserManagementController - getDepartments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
};

/**
 * Bulk import users
 */
const bulkImportUsers = async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Users array is required'
      });
    }

    // Validate each user
    const validationErrors = [];
    users.forEach((user, index) => {
      if (!user.firstName || !user.lastName || !user.email) {
        validationErrors.push(`Row ${index + 1}: First name, last name, and email are required`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: validationErrors
      });
    }

    const result = await userManagementService.bulkImportUsers(
      users,
      req.user?.instance || 'default'
    );

    res.json({
      success: true,
      message: `Successfully imported ${result.success} users. ${result.failed} failed.`,
      data: result
    });
  } catch (error) {
    console.error('UserManagementController - bulkImportUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import users',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserStats,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  getDeactivationLog,
  getDepartments,
  bulkImportUsers
};
