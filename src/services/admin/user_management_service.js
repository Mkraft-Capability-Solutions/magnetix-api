const { promisePool: pool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Admin User Management Service
 * Handles all business logic for unified user management
 */

/**
 * Get all users with pagination and filtering
 */
const getAllUsers = async (filters = {}) => {
  try {
    const { search, status, department, role, page = 1, limit = 10 } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clauses
    let whereConditions = ['u.is_deleted = 0'];
    let queryParams = [];

    // Search filter
    if (search && search !== '') {
      whereConditions.push(`(CONCAT(profile.first_name, ' ', profile.last_name) LIKE ? OR u.email LIKE ?)`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Status filter
    if (status && status !== '' && status !== 'All Status') {
      whereConditions.push('u.status = ?');
      queryParams.push(status.toLowerCase());
    }

    // Department filter
    if (department && department !== '' && department !== 'All Department') {
      whereConditions.push('sci.department = ?');
      queryParams.push(department);
    }

    // Role filter
    if (role && role !== '' && role !== 'All Roles') {
      if (role === 'student') whereConditions.push('u.role_id = 1');
      else if (role === 'instructor') whereConditions.push('u.role_id = 2');
      else if (role === 'admin') whereConditions.push('u.role_id = 3');
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL
        SELECT user_id, first_name, last_name FROM instructors
        UNION ALL
        SELECT user_id, first_name, last_name FROM admins
      ) profile ON u.uuid = profile.user_id
      LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
      WHERE ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, queryParams);
    const totalCount = countResult[0]?.total_count || 0;

    // Get paginated users
    const usersQuery = `
      SELECT
        u.uuid as id,
        CONCAT(profile.first_name, ' ', profile.last_name) as name,
        UPPER(CONCAT(LEFT(profile.first_name, 1), LEFT(profile.last_name, 1))) as initials,
        u.email,
        CASE u.role_id
          WHEN 1 THEN 'student'
          WHEN 2 THEN 'instructor'
          WHEN 3 THEN 'admin'
        END as role,
        COALESCE(sci.department, 'N/A') as department,
        COALESCE(sci.designation, sci.job_profile, 'N/A') as jobTitle,
        CASE
          WHEN u.status = 'active' THEN 'Active'
          ELSE 'Inactive'
        END as status,
        u.updated_at as lastLogin,
        COALESCE(active_courses.count, 0) as coursesActive,
        COALESCE(completed_courses.count, 0) as coursesCompleted,
        u.created_at as createdAt,
        profile.dp as avatar,
        profile.contact as phone,
        profile.city as location,
        sci.manager_name as manager
      FROM users u
      LEFT JOIN (
        SELECT user_id, first_name, last_name, dp, contact, city FROM students
        UNION ALL
        SELECT user_id, first_name, last_name, dp, contact, city FROM instructors
        UNION ALL
        SELECT user_id, first_name, last_name, dp, contact, city FROM admins
      ) profile ON u.uuid = profile.user_id
      LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
      LEFT JOIN (
        SELECT e.user_id, COUNT(DISTINCT e.course_id) as count
        FROM enrol e
        LEFT JOIN (
          SELECT cp.enroll_id,
                 SUM(cp.lesson_completed) as completed_lessons,
                 COUNT(*) as total_lessons
          FROM course_progress cp
          GROUP BY cp.enroll_id
        ) progress ON e.id = progress.enroll_id
        WHERE progress.completed_lessons IS NULL OR progress.completed_lessons < progress.total_lessons
        GROUP BY e.user_id
      ) active_courses ON u.uuid = active_courses.user_id
      LEFT JOIN (
        SELECT e.user_id, COUNT(DISTINCT e.course_id) as count
        FROM enrol e
        INNER JOIN (
          SELECT cp.enroll_id,
                 SUM(cp.lesson_completed) as completed_lessons,
                 COUNT(*) as total_lessons
          FROM course_progress cp
          GROUP BY cp.enroll_id
          HAVING SUM(cp.lesson_completed) = COUNT(*)
        ) progress ON e.id = progress.enroll_id
        GROUP BY e.user_id
      ) completed_courses ON u.uuid = completed_courses.user_id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [users] = await pool.query(usersQuery, [...queryParams, parseInt(limit), offset]);

    return {
      users,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    };
  } catch (error) {
    console.error('UserManagementService - getAllUsers error:', error);
    throw error;
  }
};

/**
 * Get user statistics
 */
const getUserStats = async () => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_deleted = 0) as totalUsers,
        (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND status = 'active') as activeUsers,
        (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND status != 'active') as inactiveUsers,
        (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as newThisMonth
    `;

    const [rows] = await pool.query(statsQuery);
    const stats = rows[0] || {};

    return {
      totalUsers: stats.totalUsers || 0,
      activeUsers: stats.activeUsers || 0,
      inactiveUsers: stats.inactiveUsers || 0,
      newThisMonth: stats.newThisMonth || 0
    };
  } catch (error) {
    console.error('UserManagementService - getUserStats error:', error);
    throw error;
  }
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  try {
    const userQuery = `
      SELECT
        u.uuid as id,
        CONCAT(profile.first_name, ' ', profile.last_name) as name,
        profile.first_name as firstName,
        profile.last_name as lastName,
        UPPER(CONCAT(LEFT(profile.first_name, 1), LEFT(profile.last_name, 1))) as initials,
        u.email,
        CASE u.role_id
          WHEN 1 THEN 'student'
          WHEN 2 THEN 'instructor'
          WHEN 3 THEN 'admin'
        END as role,
        u.role_id as roleId,
        COALESCE(sci.department, 'N/A') as department,
        COALESCE(sci.designation, sci.job_profile, 'N/A') as jobTitle,
        CASE
          WHEN u.status = 'active' THEN 'Active'
          ELSE 'Inactive'
        END as status,
        u.updated_at as lastLogin,
        u.created_at as joinDate,
        profile.dp as avatar,
        profile.contact as phone,
        profile.city as location,
        profile.address,
        profile.state,
        profile.country,
        sci.manager_name as manager,
        sci.organization_name as organization,
        COALESCE(completed_courses.count, 0) as coursesCompleted,
        COALESCE(active_courses.count, 0) as coursesActive,
        (COALESCE(completed_courses.count, 0) + COALESCE(active_courses.count, 0)) as totalCourses
      FROM users u
      LEFT JOIN (
        SELECT user_id, first_name, last_name, dp, contact, city, address, state, country FROM students
        UNION ALL
        SELECT user_id, first_name, last_name, dp, contact, city, address, state, country FROM instructors
        UNION ALL
        SELECT user_id, first_name, last_name, dp, contact, city, address, state, country FROM admins
      ) profile ON u.uuid = profile.user_id
      LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
      LEFT JOIN (
        SELECT e.user_id, COUNT(DISTINCT e.course_id) as count
        FROM enrol e
        LEFT JOIN (
          SELECT cp.enroll_id,
                 SUM(cp.lesson_completed) as completed_lessons,
                 COUNT(*) as total_lessons
          FROM course_progress cp
          GROUP BY cp.enroll_id
        ) progress ON e.id = progress.enroll_id
        WHERE progress.completed_lessons IS NULL OR progress.completed_lessons < progress.total_lessons
        GROUP BY e.user_id
      ) active_courses ON u.uuid = active_courses.user_id
      LEFT JOIN (
        SELECT e.user_id, COUNT(DISTINCT e.course_id) as count
        FROM enrol e
        INNER JOIN (
          SELECT cp.enroll_id,
                 SUM(cp.lesson_completed) as completed_lessons,
                 COUNT(*) as total_lessons
          FROM course_progress cp
          GROUP BY cp.enroll_id
          HAVING SUM(cp.lesson_completed) = COUNT(*)
        ) progress ON e.id = progress.enroll_id
        GROUP BY e.user_id
      ) completed_courses ON u.uuid = completed_courses.user_id
      WHERE u.uuid = ? AND u.is_deleted = 0
    `;

    const [rows] = await pool.query(userQuery, [userId]);
    const user = rows[0] || null;

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('UserManagementService - getUserById error:', error);
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

    return {
      success: result?.success === 1,
      message: result?.message || 'User created',
      userId: uuid,
      generatedPassword // Return this so admin can share with user
    };
  } catch (error) {
    console.error('UserManagementService - createUser error:', error);

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
    console.error('UserManagementService - updateUser error:', error);
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
    console.error('UserManagementService - deactivateUser error:', error);
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
    console.error('UserManagementService - reactivateUser error:', error);
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
    console.error('UserManagementService - getDeactivationLog error:', error);
    throw error;
  }
};

/**
 * Get distinct departments for filter dropdown
 */
const getDepartments = async () => {
  try {
    const departmentsQuery = `
      SELECT DISTINCT department
      FROM student_corporate_info
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `;

    const [rows] = await pool.query(departmentsQuery);
    return rows.map(d => d.department).filter(Boolean);
  } catch (error) {
    console.error('UserManagementService - getDepartments error:', error);
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
    console.error('UserManagementService - bulkImportUsers error:', error);
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
