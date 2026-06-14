const { promisePool: pool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { ROLE_LABELS, sendInvitationSafely } = require('../../utils/invitation_helper');
const { ROLE_SUPER_ADMIN } = require('../../utils/org_scoping');

/**
 * Admin User Management Service
 * Handles all business logic for unified user management
 */

/**
 * Log admin action to admin_user_logs table
 */
const logAdminAction = async (logData) => {
  try {
    const {
      userId,
      adminId,
      actionType,
      actionDescription,
      oldValue = null,
      newValue = null,
      additionalData = null
    } = logData;

    await pool.query(
      `INSERT INTO admin_user_logs
       (user_id, admin_id, action_type, action_description, old_value, new_value, additional_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, adminId, actionType, actionDescription, oldValue, newValue,
       additionalData ? JSON.stringify(additionalData) : null]
    );
  } catch (error) {
    console.error('UserManagementService - logAdminAction error:', error);
    // Don't throw error here to prevent logging from breaking the main operation
  }
};

/**
 * Get all users with pagination and filtering. Org-scoped: org admins see
 * only users who share at least one organization with them. Super-admins
 * see everything.
 */
const getAllUsers = async (filters = {}, callerUuid = null, roleId = ROLE_SUPER_ADMIN) => {
  try {
    const { search, status, department, role, page = 1, limit = 10 } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clauses
    let whereConditions = ['u.is_deleted = 0'];
    let queryParams = [];

    // Org-scoping for non-super-admins. Filter to users in the caller's orgs.
    if (roleId !== ROLE_SUPER_ADMIN && callerUuid) {
      whereConditions.push(`u.uuid IN (
        SELECT uo.user_id
          FROM user_organizations uo
         WHERE uo.organization_id IN (
           SELECT organization_id FROM user_organizations WHERE user_id = ?
         )
      )`);
      queryParams.push(callerUuid);
    }

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
        sci.department as department,
        COALESCE(sci.designation, sci.job_profile) as jobTitle,
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
        sci.manager_name as manager,
        u.reports_to_uuid as reportsToId,
        rprofile.full_name as reportsToName
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
      LEFT JOIN (
        SELECT user_id, CONCAT(first_name, ' ', last_name) AS full_name FROM students
        UNION ALL
        SELECT user_id, CONCAT(first_name, ' ', last_name) AS full_name FROM instructors
        UNION ALL
        SELECT user_id, CONCAT(first_name, ' ', last_name) AS full_name FROM admins
      ) rprofile ON u.reports_to_uuid = rprofile.user_id
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
 * Get user statistics. Org-scoped: org admins see counts for users in
 * their own orgs only. Super-admins see system-wide counts.
 */
const getUserStats = async (callerUuid = null, roleId = ROLE_SUPER_ADMIN) => {
  try {
    if (roleId === ROLE_SUPER_ADMIN || !callerUuid) {
      const [rows] = await pool.query(
        `SELECT
            (SELECT COUNT(*) FROM users WHERE is_deleted = 0) AS totalUsers,
            (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND status = 'active') AS activeUsers,
            (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND status != 'active') AS inactiveUsers,
            (SELECT COUNT(*) FROM users WHERE is_deleted = 0 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS newThisMonth`
      );
      const stats = rows[0] || {};
      return {
        totalUsers: stats.totalUsers || 0,
        activeUsers: stats.activeUsers || 0,
        inactiveUsers: stats.inactiveUsers || 0,
        newThisMonth: stats.newThisMonth || 0
      };
    }

    // Org-scoped — restrict to users sharing at least one org with the caller.
    const orgFilterSql = `
      AND u.uuid IN (
        SELECT uo.user_id FROM user_organizations uo
         WHERE uo.organization_id IN (
           SELECT organization_id FROM user_organizations WHERE user_id = ?
         )
      )
    `;
    const [rows] = await pool.query(
      `SELECT
          (SELECT COUNT(*) FROM users u WHERE u.is_deleted = 0 ${orgFilterSql}) AS totalUsers,
          (SELECT COUNT(*) FROM users u WHERE u.is_deleted = 0 AND u.status = 'active' ${orgFilterSql}) AS activeUsers,
          (SELECT COUNT(*) FROM users u WHERE u.is_deleted = 0 AND u.status != 'active' ${orgFilterSql}) AS inactiveUsers,
          (SELECT COUNT(*) FROM users u WHERE u.is_deleted = 0 AND u.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ${orgFilterSql}) AS newThisMonth`,
      [callerUuid, callerUuid, callerUuid, callerUuid]
    );
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
        sci.department as department,
        COALESCE(sci.designation, sci.job_profile) as jobTitle,
        CONCAT(UCASE(LEFT(u.status, 1)), SUBSTRING(u.status, 2)) as status,
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

    console.log('getUserById result:', {
      userId,
      coursesCompleted: user.coursesCompleted,
      coursesActive: user.coursesActive,
      totalCourses: user.totalCourses
    });

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
      instance = 'default',
      organizationId // New optional field
    } = userData;

    // Generate UUID and password
    const uuid = uuidv4();
    const generatedPassword = crypto.randomBytes(6).toString('base64');

    // Hash password using bcrypt (same as auth service)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    const [rows] = await pool.query(
      'CALL sp_create_user(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, email, hashedPassword, role, firstName, lastName, department, jobTitle, instance]
    );

    const result = rows[0]?.[0];
    const success = result?.success === 1;

    // Collected org names so the invitation email can mention which orgs the
    // new user was added to ("You've been added to: Acme, Globex as Administrator").
    const assignedOrgNames = [];

    // If user created successfully and organizationId provided, assign to organization(s)
    if (success && organizationId) {
      try {
        // Convert to array if single value
        let orgIds = Array.isArray(organizationId) ? organizationId : [organizationId];

        // Filter out empty strings
        orgIds = orgIds.filter(id => id !== '' && id !== null && id !== undefined);

        if (orgIds.length > 0) {
          // Get role_id to check constraints
          const roleId = role === 'admin' ? 3 : role === 'instructor' ? 2 : 1;

          // For students/instructors, only allow one organization
          if ((roleId === 1 || roleId === 2) && orgIds.length > 1) {
            console.warn(`Students and instructors can only belong to one organization. Using first organization only.`);
            orgIds = [orgIds[0]];
          }

          // Process each organization ID
          for (const orgIdRaw of orgIds) {
            const orgId = parseInt(orgIdRaw);

            // Verify organization exists and is active
            const [orgCheck] = await pool.query(
              'SELECT id, name, is_active FROM organizations WHERE id = ?',
              [orgId]
            );

            if (orgCheck.length > 0) {
              // Allow assignment regardless of is_active — admins occasionally
              // add users to a not-yet-activated org. The previous strict
              // `is_active === 1` check could also fail when the driver returns
              // the column as a non-strict-1 type, silently dropping the assignment.
              // Check if already assigned (to avoid duplicate key errors)
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
            } else {
              console.warn(`Organization ${orgId} not found`);
            }
          }
        }
      } catch (orgError) {
        console.error('Failed to assign user to organization:', orgError);
        // Don't fail user creation if organization assignment fails
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
      generatedPassword, // Return this so admin can share with user
      invitationSent
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
const updateUser = async (userId, userData, adminId) => {
  try {
    const { firstName, lastName, department, jobTitle, status } = userData;

    const [rows] = await pool.query(
      'CALL sp_update_user(?, ?, ?, ?, ?, ?)',
      [userId, firstName, lastName, department, jobTitle, status]
    );

    const result = rows[0]?.[0];

    // Log admin action
    if (result?.success === 1 && adminId) {
      const changes = [];
      if (firstName) changes.push(`firstName: ${firstName}`);
      if (lastName) changes.push(`lastName: ${lastName}`);
      if (department) changes.push(`department: ${department}`);
      if (jobTitle) changes.push(`jobTitle: ${jobTitle}`);

      await logAdminAction({
        userId,
        adminId,
        actionType: 'update',
        actionDescription: `Updated user profile: ${changes.join(', ')}`,
        additionalData: { firstName, lastName, department, jobTitle }
      });
    }

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
 * Change user status (direct SQL, no stored procedure)
 */
const changeUserStatus = async (userId, status, adminId) => {
  try {
    // Convert status to lowercase for database
    const dbStatus = status.toLowerCase();

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(dbStatus)) {
      return {
        success: false,
        message: 'Invalid status value'
      };
    }

    // Get old status first
    const [userRows] = await pool.query(
      'SELECT status FROM users WHERE uuid = ? AND is_deleted = 0',
      [userId]
    );
    const oldStatus = userRows[0]?.status || null;

    // Update user status directly
    const [result] = await pool.query(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE uuid = ? AND is_deleted = 0',
      [dbStatus, userId]
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Log admin action
    if (adminId) {
      await logAdminAction({
        userId,
        adminId,
        actionType: 'status_change',
        actionDescription: `Changed user status from ${oldStatus} to ${status}`,
        oldValue: oldStatus,
        newValue: status
      });
    }

    return {
      success: true,
      message: `User status updated to ${status} successfully`
    };
  } catch (error) {
    console.error('UserManagementService - changeUserStatus error:', error);
    throw error;
  }
};

/**
 * Change user role (migrates data between role tables)
 */
const changeUserRole = async (userId, newRole, adminId) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get current user role and data
    const [userRows] = await connection.query(
      'SELECT role_id, email FROM users WHERE uuid = ? AND is_deleted = 0',
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        message: 'User not found'
      };
    }

    const currentRoleId = userRows[0].role_id;
    const newRoleId = newRole === 'admin' ? 3 : newRole === 'instructor' ? 2 : newRole === 'super_admin' ? 4 : 1;

    // Get old role name for logging
    const oldRole = currentRoleId === 1 ? 'student' :
                    currentRoleId === 2 ? 'instructor' :
                    currentRoleId === 3 ? 'admin' : 'super_admin';

    // If role is the same, no need to change
    if (currentRoleId === newRoleId) {
      await connection.rollback();
      return {
        success: false,
        message: 'User already has this role'
      };
    }

    // Get user profile data from current role table
    let currentTableName = currentRoleId === 1 ? 'students' :
                          currentRoleId === 2 ? 'instructors' :
                          currentRoleId === 3 ? 'admins' : 'super_admins';

    const [profileRows] = await connection.query(
      `SELECT first_name, last_name, dp, contact, city, address, state, country
       FROM ${currentTableName} WHERE user_id = ?`,
      [userId]
    );

    if (profileRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        message: 'User profile not found'
      };
    }

    const profile = profileRows[0];

    // Delete from current role table
    await connection.query(
      `DELETE FROM ${currentTableName} WHERE user_id = ?`,
      [userId]
    );

    // If changing from student, delete corporate info
    if (currentRoleId === 1) {
      await connection.query(
        'DELETE FROM student_corporate_info WHERE user_id = ?',
        [userId]
      );
    }

    // Insert into new role table
    let newTableName = newRoleId === 1 ? 'students' :
                      newRoleId === 2 ? 'instructors' :
                      newRoleId === 3 ? 'admins' : 'super_admins';

    await connection.query(
      `INSERT INTO ${newTableName} (user_id, first_name, last_name, dp, contact, city, address, state, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, profile.first_name, profile.last_name, profile.dp, profile.contact,
       profile.city, profile.address, profile.state, profile.country]
    );

    // Update role_id in users table
    await connection.query(
      'UPDATE users SET role_id = ?, updated_at = NOW() WHERE uuid = ?',
      [newRoleId, userId]
    );

    await connection.commit();

    // Log admin action
    if (adminId) {
      await logAdminAction({
        userId,
        adminId,
        actionType: 'role_change',
        actionDescription: `Changed user role from ${oldRole} to ${newRole}`,
        oldValue: oldRole,
        newValue: newRole
      });
    }

    return {
      success: true,
      message: `User role updated to ${newRole} successfully`
    };
  } catch (error) {
    await connection.rollback();
    console.error('UserManagementService - changeUserRole error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Reset user password
 */
const resetUserPassword = async (userId, adminId) => {
  try {
    // Generate new random password
    const newPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);

    // Hash password using bcrypt (same as auth service)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    const [result] = await pool.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE uuid = ? AND is_deleted = 0',
      [hashedPassword, userId]
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Log admin action
    if (adminId) {
      await logAdminAction({
        userId,
        adminId,
        actionType: 'password_reset',
        actionDescription: 'Reset user password'
      });
    }

    return {
      success: true,
      message: 'Password reset successfully',
      newPassword // Return this to display to admin or send via email
    };
  } catch (error) {
    console.error('UserManagementService - resetUserPassword error:', error);
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
 * Get user's learning history (enrolled courses with progress)
 */
const getUserLearningHistory = async (userId) => {
  try {
    const learningHistoryQuery = `
      SELECT
        c.id as id,
        c.title as name,
        COALESCE(cat.name, c.level) as type,
        e.enrolled_date as enrolledDate,
        COALESCE(c.total_lessons, 0) as totalLessons,
        COALESCE(progress_info.completed_lessons, 0) as completedLessons,
        CASE
          WHEN progress_info.completed_lessons IS NULL THEN 0
          WHEN c.total_lessons = 0 THEN 0
          ELSE ROUND((progress_info.completed_lessons / c.total_lessons) * 100)
        END as progress,
        CASE
          WHEN progress_info.completed_lessons = c.total_lessons AND c.total_lessons > 0
          THEN 'Completed'
          WHEN progress_info.completed_lessons > 0
          THEN 'In Progress'
          ELSE 'Not Started'
        END as status,
        CASE
          WHEN progress_info.completed_lessons = c.total_lessons AND c.total_lessons > 0
          THEN progress_info.last_completed_date
          ELSE NULL
        END as completedDate
      FROM enrol e
      INNER JOIN course c ON e.course_id = c.id
      LEFT JOIN course_category cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT
          cp.enroll_id,
          SUM(cp.lesson_completed) as completed_lessons,
          MAX(cp.last_access) as last_completed_date
        FROM course_progress cp
        GROUP BY cp.enroll_id
      ) progress_info ON e.id = progress_info.enroll_id
      WHERE e.user_id = ? AND c.is_deleted = 0
      ORDER BY e.enrolled_date DESC
    `;

    const [rows] = await pool.query(learningHistoryQuery, [userId]);
    return rows;
  } catch (error) {
    console.error('UserManagementService - getUserLearningHistory error:', error);
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
 * Get all courses for enrollment with pagination and search
 */
const getCoursesForEnrollment = async (userId, filters = {}) => {
  try {
    const { search, page = 1, limit = 10 } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ['c.is_deleted = 0', "c.status = 'active'"];
    let queryParams = [];

    // Search filter
    if (search && search !== '') {
      whereConditions.push('(c.title LIKE ? OR c.short_description LIKE ? OR cat.name LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM course c
      LEFT JOIN course_category cat ON c.category_id = cat.id
      WHERE ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, queryParams);
    const totalCount = countResult[0]?.total_count || 0;

    // Get paginated courses
    const coursesQuery = `
      SELECT
        c.id,
        c.title as name,
        c.short_description as description,
        c.level,
        c.total_lessons as lessons,
        c.course_duration as duration,
        c.thumbnail,
        COALESCE(cat.name, c.level) as category,
        CASE
          WHEN e.id IS NOT NULL THEN 1
          ELSE 0
        END as isEnrolled
      FROM course c
      LEFT JOIN course_category cat ON c.category_id = cat.id
      LEFT JOIN enrol e ON c.id = e.course_id AND e.user_id = ?
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [courses] = await pool.query(coursesQuery, [userId, ...queryParams, parseInt(limit), offset]);

    return {
      courses,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    };
  } catch (error) {
    console.error('UserManagementService - getCoursesForEnrollment error:', error);
    throw error;
  }
};

/**
 * Enroll user in a course
 */
const enrollUserInCourse = async (userId, courseId, adminId) => {
  try {
    // Check if already enrolled
    const [existing] = await pool.query(
      'SELECT id FROM enrol WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existing.length > 0) {
      return {
        success: false,
        message: 'User is already enrolled in this course'
      };
    }

    // Get course name for logging
    const [courseRows] = await pool.query(
      'SELECT title FROM course WHERE id = ?',
      [courseId]
    );
    const courseName = courseRows[0]?.title || `Course ID: ${courseId}`;

    // Enroll user
    await pool.query(
      'INSERT INTO enrol (user_id, course_id, enrolled_date) VALUES (?, ?, NOW())',
      [userId, courseId]
    );

    // Log admin action
    if (adminId) {
      await logAdminAction({
        userId,
        adminId,
        actionType: 'enroll',
        actionDescription: `Enrolled user in course: ${courseName}`,
        additionalData: { courseId, courseName }
      });
    }

    return {
      success: true,
      message: 'User enrolled successfully'
    };
  } catch (error) {
    console.error('UserManagementService - enrollUserInCourse error:', error);
    throw error;
  }
};

/**
 * Unenroll user from a course
 */
const unenrollUserFromCourse = async (userId, courseId, adminId) => {
  try {
    // Check if enrolled
    const [existing] = await pool.query(
      'SELECT id FROM enrol WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existing.length === 0) {
      return {
        success: false,
        message: 'User is not enrolled in this course'
      };
    }

    // Get course name for logging
    const [courseRows] = await pool.query(
      'SELECT title FROM course WHERE id = ?',
      [courseId]
    );
    const courseName = courseRows[0]?.title || `Course ID: ${courseId}`;

    // Delete enrollment
    await pool.query(
      'DELETE FROM enrol WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    // Also delete course progress data
    await pool.query(
      'DELETE cp FROM course_progress cp INNER JOIN enrol e ON cp.enroll_id = e.id WHERE e.user_id = ? AND e.course_id = ?',
      [userId, courseId]
    );

    // Log admin action
    if (adminId) {
      await logAdminAction({
        userId,
        adminId,
        actionType: 'unenroll',
        actionDescription: `Unenrolled user from course: ${courseName}`,
        additionalData: { courseId, courseName }
      });
    }

    return {
      success: true,
      message: 'User unenrolled successfully'
    };
  } catch (error) {
    console.error('UserManagementService - unenrollUserFromCourse error:', error);
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

        // Hash password using bcrypt (same as auth service)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(generatedPassword, salt);

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

/**
 * Get admin logs for a specific user with pagination
 */
const getAdminLogs = async (userId, page = 1, limit = 10) => {
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total_count FROM admin_user_logs WHERE user_id = ?',
      [userId]
    );
    const totalCount = countResult[0]?.total_count || 0;

    // Get paginated logs with admin details
    const logsQuery = `
      SELECT
        aul.id,
        aul.action_type as actionType,
        aul.action_description as actionDescription,
        aul.old_value as oldValue,
        aul.new_value as newValue,
        aul.additional_data as additionalData,
        aul.created_at as createdAt,
        CONCAT(admin_profile.first_name, ' ', admin_profile.last_name) as adminName
      FROM admin_user_logs aul
      LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL
        SELECT user_id, first_name, last_name FROM instructors
        UNION ALL
        SELECT user_id, first_name, last_name FROM admins
        UNION ALL
        SELECT user_id, first_name, last_name FROM super_admins
      ) admin_profile ON aul.admin_id = admin_profile.user_id
      WHERE aul.user_id = ?
      ORDER BY aul.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [logs] = await pool.query(logsQuery, [userId, parseInt(limit), offset]);

    return {
      logs,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    };
  } catch (error) {
    console.error('UserManagementService - getAdminLogs error:', error);
    throw error;
  }
};

/**
 * Set or clear the reports-to (direct manager) for a user.
 * Cycle prevention: the new manager cannot be the user themselves, nor can
 * they be anywhere downstream of the user (which would create a loop).
 * Org-scoping: org-admins can only do this for users in their own orgs and
 * the new manager must share at least one org with the user.
 */
const setReportsTo = async (userId, reportsToUuid, callerUuid, roleId) => {
  if (!userId) throw new Error('userId is required');

  // Self-loop check
  if (reportsToUuid && reportsToUuid === userId) {
    const e = new Error('A user cannot report to themselves');
    e.statusCode = 400;
    throw e;
  }

  // Org-scope: org-admin must share an org with both user and new manager
  if (roleId !== ROLE_SUPER_ADMIN && callerUuid) {
    const [shareUserRows] = await pool.query(
      `SELECT 1 FROM user_organizations
        WHERE user_id = ?
          AND organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = ?
          )
        LIMIT 1`,
      [userId, callerUuid]
    );
    if (shareUserRows.length === 0) {
      const e = new Error('User is not in any of your organizations');
      e.statusCode = 403;
      throw e;
    }
    if (reportsToUuid) {
      const [shareMgrRows] = await pool.query(
        `SELECT 1 FROM user_organizations
          WHERE user_id = ?
            AND organization_id IN (
              SELECT organization_id FROM user_organizations WHERE user_id = ?
            )
          LIMIT 1`,
        [reportsToUuid, callerUuid]
      );
      if (shareMgrRows.length === 0) {
        const e = new Error('New manager is not in any of your organizations');
        e.statusCode = 403;
        throw e;
      }
    }
  }

  // Cycle check: the proposed manager must not already be a descendant of `userId`.
  if (reportsToUuid) {
    const { getDescendantUserUuids } = require('../../utils/manager_hierarchy');
    const descendants = await getDescendantUserUuids(userId);
    if (descendants.includes(reportsToUuid)) {
      const e = new Error('Cannot set reports-to: the chosen user reports to this user (would create a cycle)');
      e.statusCode = 400;
      throw e;
    }
  }

  await pool.query(
    'UPDATE users SET reports_to_uuid = ? WHERE uuid = ? AND is_deleted = 0',
    [reportsToUuid || null, userId]
  );
  return { affectedRows: 1 };
};

module.exports = {
  getAllUsers,
  getUserStats,
  getUserById,
  getUserLearningHistory,
  getCoursesForEnrollment,
  enrollUserInCourse,
  unenrollUserFromCourse,
  createUser,
  updateUser,
  changeUserStatus,
  changeUserRole,
  resetUserPassword,
  deactivateUser,
  reactivateUser,
  getDeactivationLog,
  getDepartments,
  bulkImportUsers,
  getAdminLogs,
  setReportsTo
};
