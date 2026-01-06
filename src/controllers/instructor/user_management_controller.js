const userManagementService = require('../../services/instructor/user_management_service');

/**
 * Get all students with filtering and pagination
 */
const getAllUsers = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { search, status, department, page = 1, limit = 10 } = req.query;

    const result = await userManagementService.getAllUsers(instructorId, {
      search,
      status,
      department,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Instructor UserManagementController - getAllUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

/**
 * Get user statistics (students only)
 */
const getUserStats = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const stats = await userManagementService.getUserStats(instructorId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Instructor UserManagementController - getUserStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

/**
 * Get single student by ID
 */
const getUserById = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { id } = req.params;

    const user = await userManagementService.getUserById(instructorId, id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Instructor UserManagementController - getUserById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
      error: error.message
    });
  }
};

/**
 * Create a new student
 */
const createUser = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { firstName, lastName, email, department, jobTitle } = req.body;

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

    const result = await userManagementService.createUser(instructorId, {
      firstName,
      lastName,
      email,
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
    console.error('Instructor UserManagementController - createUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error.message
    });
  }
};

/**
 * Update student
 */
const updateUser = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { id } = req.params;
    const { firstName, lastName, department, jobTitle, status } = req.body;

    const result = await userManagementService.updateUser(instructorId, id, {
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
    console.error('Instructor UserManagementController - updateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message
    });
  }
};

/**
 * Deactivate student
 */
const deactivateUser = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const result = await userManagementService.deactivateUser(instructorId, id, reason);

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
    console.error('Instructor UserManagementController - deactivateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate student',
      error: error.message
    });
  }
};

/**
 * Reactivate student
 */
const reactivateUser = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { id } = req.params;

    const result = await userManagementService.reactivateUser(instructorId, id);

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
    console.error('Instructor UserManagementController - reactivateUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate student',
      error: error.message
    });
  }
};

/**
 * Get deactivation log
 */
const getDeactivationLog = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { page = 1, limit = 10 } = req.query;

    const result = await userManagementService.getDeactivationLog(
      instructorId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Instructor UserManagementController - getDeactivationLog error:', error);
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
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const departments = await userManagementService.getDepartments(instructorId);

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Instructor UserManagementController - getDepartments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
};

/**
 * Bulk import students
 */
const bulkImportUsers = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;
    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

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
      instructorId,
      users,
      req.user?.instance || 'default'
    );

    res.json({
      success: true,
      message: `Successfully imported ${result.success} students. ${result.failed} failed.`,
      data: result
    });
  } catch (error) {
    console.error('Instructor UserManagementController - bulkImportUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import students',
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
