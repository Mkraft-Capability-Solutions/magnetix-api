const { promisePool: pool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { ROLE_LABELS, sendInvitationSafely } = require('../../utils/invitation_helper');

/**
 * Super Admin User Management Service
 * Uses the same stored procedures as Admin
 */

/**
 * Get all users with pagination and filtering
 */
const getAllUsers = async (filters = {}) => {
  try {
    const { search, status, department, role, page = 1, limit = 10 } = filters;

    const [countResult] = await pool.query(
      'CALL sp_get_all_users(?, ?, ?, ?, ?, ?)',
      [search || null, status || null, department || null, role || null, page, limit]
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
    console.error('Super Admin UserManagementService - getAllUsers error:', error);
    throw error;
  }
};

/**
 * Get user statistics
 */
const getUserStats = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_user_stats()');
    const stats = rows[0]?.[0] || {};

    return {
      totalUsers: stats.totalUsers || 0,
      activeUsers: stats.activeUsers || 0,
      inactiveUsers: stats.inactiveUsers || 0,
      newThisMonth: stats.newThisMonth || 0
    };
  } catch (error) {
    console.error('Super Admin UserManagementService - getUserStats error:', error);
    throw error;
  }
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_user_by_id(?)', [userId]);
    const user = rows[0]?.[0] || null;

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Super Admin UserManagementService - getUserById error:', error);
    throw error;
  }
};

/**
 * Create a new user
 */
const createUser = async (userData) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role = 'student',
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

    const [rows] = await pool.query(
      'CALL sp_create_user(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, email, hashedPassword, role, firstName, lastName, department, jobTitle, instance]
    );

    const result = rows[0]?.[0];
    const success = result?.success === 1;

    let invitationSent = false;
    if (success) {
      const { sent } = await sendInvitationSafely({
        email,
        firstName,
        password: generatedPassword,
        roleLabel: ROLE_LABELS[role?.toLowerCase()] || 'User'
      });
      invitationSent = sent;
    }

    return {
      success,
      message: result?.message || 'User created',
      userId: uuid,
      generatedPassword, // Return this so super admin can share with user
      invitationSent
    };
  } catch (error) {
    console.error('Super Admin UserManagementService - createUser error:', error);

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
 * Update user
 */
const updateUser = async (userId, userData) => {
  try {
    const { firstName, lastName, department, jobTitle, status } = userData;

    const [rows] = await pool.query(
      'CALL sp_update_user(?, ?, ?, ?, ?, ?)',
      [userId, firstName, lastName, department, jobTitle, status]
    );

    const result = rows[0]?.[0];

    return {
      success: result?.success === 1,
      message: result?.message || 'User updated'
    };
  } catch (error) {
    console.error('Super Admin UserManagementService - updateUser error:', error);
    throw error;
  }
};

/**
 * Deactivate user
 */
const deactivateUser = async (userId, deactivatedBy, reason) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_deactivate_user(?, ?, ?)',
      [userId, deactivatedBy, reason]
    );

    const result = rows[0]?.[0];

    return {
      success: result?.success === 1,
      message: result?.message || 'User deactivated'
    };
  } catch (error) {
    console.error('Super Admin UserManagementService - deactivateUser error:', error);
    throw error;
  }
};

/**
 * Reactivate user
 */
const reactivateUser = async (userId, reactivatedBy) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_reactivate_user(?, ?)',
      [userId, reactivatedBy]
    );

    const result = rows[0]?.[0];

    return {
      success: result?.success === 1,
      message: result?.message || 'User reactivated'
    };
  } catch (error) {
    console.error('Super Admin UserManagementService - reactivateUser error:', error);
    throw error;
  }
};

/**
 * Get deactivation log
 */
const getDeactivationLog = async (page = 1, limit = 10) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_deactivation_log(?, ?)',
      [page, limit]
    );

    const totalCount = results[0]?.[0]?.total_count || 0;
    const logs = results[1] || [];

    return {
      logs,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Super Admin UserManagementService - getDeactivationLog error:', error);
    throw error;
  }
};

/**
 * Get distinct departments for filter dropdown
 */
const getDepartments = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_departments()');
    const departments = rows[0] || [];

    return departments.map(d => d.department).filter(Boolean);
  } catch (error) {
    console.error('Super Admin UserManagementService - getDepartments error:', error);
    throw error;
  }
};

/**
 * Bulk import users from CSV data
 */
const bulkImportUsers = async (usersData, instance = 'default') => {
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

        const role = user.role || 'student';
        const roleId = role === 'admin' ? 3 : role === 'instructor' ? 2 : 1;

        // Insert into users table
        await connection.query(
          'INSERT INTO users (uuid, email, password, role_id, status, instance) VALUES (?, ?, ?, ?, ?, ?)',
          [uuid, user.email, hashedPassword, roleId, 'active', instance]
        );

        // Insert into role-specific table
        if (roleId === 1) {
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
        } else if (roleId === 2) {
          await connection.query(
            'INSERT INTO instructors (user_id, first_name, last_name) VALUES (?, ?, ?)',
            [uuid, user.firstName, user.lastName]
          );
        } else if (roleId === 3) {
          await connection.query(
            'INSERT INTO admins (user_id, first_name, last_name) VALUES (?, ?, ?)',
            [uuid, user.firstName, user.lastName]
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
    console.error('Super Admin UserManagementService - bulkImportUsers error:', error);
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
