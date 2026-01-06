const { promisePool: pool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Instructor User Management Service
 * Handles business logic for instructor managing students
 * Instructors can only manage students (role_id = 1), not other instructors or admins
 */

/**
 * Get all students with pagination and filtering
 * @param {string} instructorId - Instructor UUID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Users and pagination
 */
const getAllUsers = async (instructorId, filters = {}) => {
  try {
    const { search, status, department, page = 1, limit = 10 } = filters;

    // Instructors can only see students (role_id = 1)
    const [countResult] = await pool.query(
      'CALL sp_get_all_users(?, ?, ?, ?, ?, ?)',
      [search || null, status || null, department || null, 'student', page, limit]
    );

    // First result set is the count, second is the data
    const totalCount = countResult[0]?.[0]?.total_count || 0;
    const users = countResult[1] || [];

    return {
      users,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Instructor UserManagementService - getAllUsers error:', error);
    throw error;
  }
};

/**
 * Get user statistics (students only)
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async (instructorId) => {
  try {
    // Get stats for students only
    const [rows] = await pool.query(
      `SELECT
        COUNT(*) as totalUsers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) as inactiveUsers,
        SUM(CASE WHEN MONTH(created_at) = MONTH(CURRENT_DATE())
                 AND YEAR(created_at) = YEAR(CURRENT_DATE()) THEN 1 ELSE 0 END) as newThisMonth
      FROM users
      WHERE role_id = 1 AND is_deleted = 0`
    );

    const stats = rows[0] || {};

    return {
      totalUsers: stats.totalUsers || 0,
      activeUsers: stats.activeUsers || 0,
      inactiveUsers: stats.inactiveUsers || 0,
      newThisMonth: stats.newThisMonth || 0
    };
  } catch (error) {
    console.error('Instructor UserManagementService - getUserStats error:', error);
    throw error;
  }
};

/**
 * Get user by ID (students only)
 * @param {string} instructorId - Instructor UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} User details
 */
const getUserById = async (instructorId, userId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_user_by_id(?)', [userId]);
    const user = rows[0]?.[0] || null;

    if (!user) {
      return null;
    }

    // Verify user is a student
    if (user.role !== 'student') {
      return null; // Instructors can only view students
    }

    return user;
  } catch (error) {
    console.error('Instructor UserManagementService - getUserById error:', error);
    throw error;
  }
};

/**
 * Create a new student
 * @param {string} instructorId - Instructor UUID
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Creation result
 */
const createUser = async (instructorId, userData) => {
  try {
    const {
      firstName,
      lastName,
      email,
      department,
      jobTitle,
      instance = 'default'
    } = userData;

    // Generate UUID and password
    const uuid = uuidv4();
    const generatedPassword = crypto.randomBytes(6).toString('base64');

    // Hash password (in production, use bcrypt)
    const hashedPassword = crypto
      .createHash('sha256')
      .update(generatedPassword)
      .digest('hex');

    // Instructors can only create students
    const [rows] = await pool.query(
      'CALL sp_create_user(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, email, hashedPassword, 'student', firstName, lastName, department, jobTitle, instance]
    );

    const result = rows[0]?.[0];

    return {
      success: result?.success === 1,
      message: result?.message || 'Student created',
      userId: uuid,
      generatedPassword // Return this so instructor can share with student
    };
  } catch (error) {
    console.error('Instructor UserManagementService - createUser error:', error);

    // Handle duplicate email error
    if (error.message && error.message.includes('Email already exists')) {
      return {
        success: false,
        message: 'Email already exists'
      };
    }

    throw error;
  }
};

/**
 * Update student information
 * @param {string} instructorId - Instructor UUID
 * @param {string} userId - User UUID
 * @param {Object} userData - Updated data
 * @returns {Promise<Object>} Update result
 */
const updateUser = async (instructorId, userId, userData) => {
  try {
    // Verify user is a student
    const [checkRows] = await pool.query(
      'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0',
      [userId]
    );

    if (checkRows.length === 0 || checkRows[0].role_id !== 1) {
      return {
        success: false,
        message: 'User not found or not a student'
      };
    }

    const { firstName, lastName, department, jobTitle, status } = userData;

    const [rows] = await pool.query(
      'CALL sp_update_user(?, ?, ?, ?, ?, ?)',
      [userId, firstName, lastName, department, jobTitle, status]
    );

    const result = rows[0]?.[0];

    return {
      success: result?.success === 1,
      message: result?.message || 'Student updated'
    };
  } catch (error) {
    console.error('Instructor UserManagementService - updateUser error:', error);
    throw error;
  }
};

/**
 * Deactivate student
 * @param {string} instructorId - Instructor UUID
 * @param {string} userId - User UUID
 * @param {string} reason - Deactivation reason
 * @returns {Promise<Object>} Deactivation result
 */
const deactivateUser = async (instructorId, userId, reason) => {
  try {
    // Verify user is a student
    const [checkRows] = await pool.query(
      'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0',
      [userId]
    );

    if (checkRows.length === 0 || checkRows[0].role_id !== 1) {
      return {
        success: false,
        message: 'User not found or not a student'
      };
    }

    const [rows] = await pool.query(
      'CALL sp_deactivate_user(?, ?, ?)',
      [userId, instructorId, reason]
    );

    const result = rows[0]?.[0];

    return {
      success: result?.success === 1,
      message: result?.message || 'Student deactivated'
    };
  } catch (error) {
    console.error('Instructor UserManagementService - deactivateUser error:', error);
    throw error;
  }
};

/**
 * Reactivate student
 * @param {string} instructorId - Instructor UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Reactivation result
 */
const reactivateUser = async (instructorId, userId) => {
  try {
    // Verify user is a student
    const [checkRows] = await pool.query(
      'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0',
      [userId]
    );

    if (checkRows.length === 0 || checkRows[0].role_id !== 1) {
      return {
        success: false,
        message: 'User not found or not a student'
      };
    }

    const [rows] = await pool.query(
      'CALL sp_reactivate_user(?, ?)',
      [userId, instructorId]
    );

    const result = rows[0]?.[0];

    return {
      success: result?.success === 1,
      message: result?.message || 'Student reactivated'
    };
  } catch (error) {
    console.error('Instructor UserManagementService - reactivateUser error:', error);
    throw error;
  }
};

/**
 * Get deactivation log (students only)
 * @param {string} instructorId - Instructor UUID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Deactivation logs and pagination
 */
const getDeactivationLog = async (instructorId, page = 1, limit = 10) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_deactivation_log(?, ?)',
      [page, limit]
    );

    const totalCount = results[0]?.[0]?.total_count || 0;
    const allLogs = results[1] || [];

    // Filter to only show students (role_id = 1)
    const logs = allLogs.filter(log => log.role === 'student');

    return {
      logs,
      pagination: {
        total: logs.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(logs.length / limit)
      }
    };
  } catch (error) {
    console.error('Instructor UserManagementService - getDeactivationLog error:', error);
    throw error;
  }
};

/**
 * Get distinct departments for filter dropdown
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of department names
 */
const getDepartments = async (instructorId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_departments()');
    const departments = rows[0] || [];

    return departments.map(d => d.department).filter(Boolean);
  } catch (error) {
    console.error('Instructor UserManagementService - getDepartments error:', error);
    throw error;
  }
};

/**
 * Bulk import students from CSV data
 * @param {string} instructorId - Instructor UUID
 * @param {Array} usersData - Array of user data objects
 * @param {string} instance - Instance name
 * @returns {Promise<Object>} Import results
 */
const bulkImportUsers = async (instructorId, usersData, instance = 'default') => {
  const connection = await pool.getConnection();
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  try {
    await connection.beginTransaction();

    for (const user of usersData) {
      try {
        const uuid = uuidv4();
        const generatedPassword = crypto.randomBytes(6).toString('base64');
        const hashedPassword = crypto
          .createHash('sha256')
          .update(generatedPassword)
          .digest('hex');

        // Instructors can only import students (role_id = 1)
        const roleId = 1;

        // Insert into users table
        await connection.query(
          'INSERT INTO users (uuid, email, password, role_id, status, instance) VALUES (?, ?, ?, ?, ?, ?)',
          [uuid, user.email, hashedPassword, roleId, 'active', instance]
        );

        // Insert into students table
        await connection.query(
          'INSERT INTO students (user_id, first_name, last_name) VALUES (?, ?, ?)',
          [uuid, user.firstName, user.lastName]
        );

        if (user.department) {
          await connection.query(
            'INSERT INTO student_corporate_info (user_id, department, designation) VALUES (?, ?, ?)',
            [uuid, user.department, user.jobTitle || null]
          );
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          email: user.email,
          error: err.message
        });
      }
    }

    await connection.commit();

    return results;
  } catch (error) {
    await connection.rollback();
    console.error('Instructor UserManagementService - bulkImportUsers error:', error);
    throw error;
  } finally {
    connection.release();
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
