const { promisePool: pool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
      instance = 'default',
      organizationId
    } = userData;

    // Generate UUID and password
    const uuid = uuidv4();
    const generatedPassword = crypto.randomBytes(6).toString('base64');

    // Hash with bcrypt — must match auth_service.js verification (bcrypt.compare).
    // The legacy SHA-256 hashing here was producing accounts that could not log in.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    const [rows] = await pool.query(
      'CALL sp_create_user(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, email, hashedPassword, role, firstName, lastName, department, jobTitle, instance]
    );

    const result = rows[0]?.[0];
    const success = result?.success === 1;

    // Collected org names so the invitation email can mention which orgs the
    // new user was added to.
    const assignedOrgNames = [];

    if (success && organizationId) {
      try {
        let orgIds = Array.isArray(organizationId) ? organizationId : [organizationId];
        orgIds = orgIds.filter((id) => id !== '' && id !== null && id !== undefined);

        if (orgIds.length > 0) {
          // Students/instructors: at most one org.
          const roleId = role === 'admin' ? 3 : role === 'instructor' ? 2 : 1;
          if ((roleId === 1 || roleId === 2) && orgIds.length > 1) {
            console.warn('Students/instructors get only one org — using the first.');
            orgIds = [orgIds[0]];
          }

          for (const orgIdRaw of orgIds) {
            const orgId = parseInt(orgIdRaw, 10);
            if (Number.isNaN(orgId)) continue;
            const [orgCheck] = await pool.query(
              'SELECT id, name, is_active FROM organizations WHERE id = ?',
              [orgId]
            );
            if (orgCheck.length === 0) {
              console.warn(`Organization ${orgId} not found`);
              continue;
            }
            // Allow assignment to inactive orgs too — super admin can intentionally
            // pre-stage an inactive org. The strict `=== 1` check we used elsewhere
            // was rejecting orgs whose is_active column came back as a non-strict 1
            // (string, Buffer, etc. depending on driver config).
            const [existing] = await pool.query(
              'SELECT id FROM user_organizations WHERE user_id = ? AND organization_id = ?',
              [uuid, orgId]
            );
            if (existing.length === 0) {
              await pool.query(
                'INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)',
                [uuid, orgId]
              );
              console.log(`User ${uuid} assigned to organization ${orgId}`);
            }
            assignedOrgNames.push(orgCheck[0].name);
          }
        }
      } catch (orgError) {
        // Don't fail user creation; surface the issue in the response so the
        // caller can show a partial-success warning.
        console.error('Failed to assign user to organization:', orgError);
      }
    }

    let invitationSent = false;
    if (success) {
      const { sent } = await sendInvitationSafely({
        email,
        firstName,
        password: generatedPassword,
        roleLabel: ROLE_LABELS[role?.toLowerCase()] || 'User',
        organizationNames: assignedOrgNames
      });
      invitationSent = sent;
    }

    return {
      success,
      message: result?.message || 'User created',
      userId: uuid,
      generatedPassword, // Return this so super admin can share with user
      invitationSent,
      assignedOrgNames
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
 * Delete user (soft delete with is_deleted=1)
 */
const deleteUser = async (userId, deletedBy) => {
  try {
    // Check if user exists
    const [userRows] = await pool.query(
      'SELECT uuid, role_id FROM users WHERE uuid = ? AND (is_deleted IS NULL OR is_deleted = 0)',
      [userId]
    );

    if (userRows.length === 0) {
      return {
        success: false,
        message: 'User not found or already deleted'
      };
    }

    const roleId = userRows[0].role_id;

    // Soft delete the user by setting is_deleted = 1
    const [result] = await pool.query(
      'UPDATE users SET is_deleted = 1 WHERE uuid = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: 'Failed to delete user'
      };
    }

    return {
      success: true,
      message: 'User deleted successfully'
    };
  } catch (error) {
    console.error('Super Admin UserManagementService - deleteUser error:', error);
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
  deleteUser,
  deactivateUser,
  reactivateUser,
  getDeactivationLog,
  getDepartments,
  bulkImportUsers
};
