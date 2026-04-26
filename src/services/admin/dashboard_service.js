const { promisePool: pool } = require('../../config/db');

/**
 * Admin Dashboard Service
 * Handles all business logic for admin dashboard operations
 */

/**
 * Calculate and save/update daily dashboard statistics
 * This should be called daily (via cron job or manually)
 * @param {Date|string} date - Date to calculate stats for (defaults to today)
 * @returns {Promise<Object>} Result object with success status
 */
const calculateAndSaveDailyStats = async (date = null) => {
  try {
    // Set default to today if no date provided
    if (!date) {
      date = new Date();
    }

    // Convert to YYYY-MM-DD format
    const statDate = typeof date === 'string'
      ? date
      : date.toISOString().split('T')[0];

    // Active Learners: users with role_id=1, status='active', is_deleted=0
    const [[{ active_learners }]] = await pool.query(
      `SELECT COUNT(DISTINCT u.uuid) as active_learners
       FROM users u
       WHERE u.role_id = 1
         AND u.status = 'active'
         AND u.is_deleted = 0`
    );

    // Courses in Progress: courses with status='active' and is_deleted=0
    const [[{ courses_in_progress }]] = await pool.query(
      `SELECT COUNT(*) as courses_in_progress
       FROM course
       WHERE status = 'active'
         AND is_deleted = 0`
    );

    // Overdue Assignments: tasks past due date
    const [[{ overdue_assignments }]] = await pool.query(
      `SELECT COUNT(*) as overdue_assignments
       FROM admin_tasks
       WHERE status IN ('Pending', 'Urgent')
         AND due_date < NOW()`
    );

    // Pending Approvals: approval type tasks that are pending
    const [[{ pending_approvals }]] = await pool.query(
      `SELECT COUNT(*) as pending_approvals
       FROM admin_tasks
       WHERE task_type = 'Approval'
         AND status IN ('Pending', 'Urgent')`
    );

    // Insert or update stats for the specified date
    await pool.query(
      `INSERT INTO admin_dashboard_stats
        (stat_date, active_learners, courses_in_progress, overdue_assignments, pending_approvals)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        active_learners = VALUES(active_learners),
        courses_in_progress = VALUES(courses_in_progress),
        overdue_assignments = VALUES(overdue_assignments),
        pending_approvals = VALUES(pending_approvals),
        updated_at = NOW()`,
      [statDate, active_learners, courses_in_progress, overdue_assignments, pending_approvals]
    );

    return {
      success: true,
      message: 'Daily stats saved successfully',
      data: {
        stat_date: statDate,
        active_learners,
        courses_in_progress,
        overdue_assignments,
        pending_approvals
      }
    };
  } catch (error) {
    console.error('Dashboard Service - calculateAndSaveDailyStats error:', error);
    throw error;
  }
};

/**
 * Get dashboard statistics in real-time (no longer uses admin_dashboard_stats table)
 * @param {Date|string} date - Date parameter (currently unused, always returns current stats)
 * @returns {Promise<Array>} Array of stat objects with increase percentages
 */
const getStats = async (date = null) => {
  try {
    // Get current stats directly from database

    // Active Learners: users with role_id=1, status='active', is_deleted=0
    const [[{ active_learners }]] = await pool.query(
      `SELECT COUNT(DISTINCT u.uuid) as active_learners
       FROM users u
       WHERE u.role_id = 1
         AND u.status = 'active'
         AND u.is_deleted = 0`
    );

    // Courses in Progress: courses with status='active' and is_deleted=0
    const [[{ courses_in_progress }]] = await pool.query(
      `SELECT COUNT(*) as courses_in_progress
       FROM course
       WHERE status = 'active'
         AND is_deleted = 0`
    );

    // Overdue Assignments: tasks past due date
    const [[{ overdue_assignments }]] = await pool.query(
      `SELECT COUNT(*) as overdue_assignments
       FROM admin_tasks
       WHERE status IN ('Pending', 'Urgent')
         AND due_date < NOW()`
    );

    // Pending Approvals: approval type tasks that are pending
    const [[{ pending_approvals }]] = await pool.query(
      `SELECT COUNT(*) as pending_approvals
       FROM admin_tasks
       WHERE task_type = 'Approval'
         AND status IN ('Pending', 'Urgent')`
    );

    // Calculate increase percentage - using a simple default for now
    // Since we're getting real-time data, we show current values
    const calculateIncrease = (current) => {
      // You can enhance this later to compare with yesterday's snapshot if needed
      return '0%';
    };

    // Return results with real-time data
    return [
      {
        title: 'Active Learners',
        value: active_learners || 0,
        increase: calculateIncrease(active_learners),
        iconType: 'users'
      },
      {
        title: 'Course in Progress',
        value: courses_in_progress || 0,
        increase: calculateIncrease(courses_in_progress),
        iconType: 'book'
      },
      {
        title: 'Overdue Assignments',
        value: overdue_assignments || 0,
        increase: calculateIncrease(overdue_assignments),
        iconType: 'alert'
      },
      {
        title: 'Pending Approvals',
        value: pending_approvals || 0,
        increase: calculateIncrease(pending_approvals),
        iconType: 'check'
      }
    ];
  } catch (error) {
    console.error('Dashboard Service - getStats error:', error);
    throw error;
  }
};


/**
 * Get top courses by enrollment
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {number} limit - Number of courses to return (default 5)
 * @returns {Promise<Array>} Array of course objects
 */
const getTopCourses = async (startDate = null, endDate = null, limit = 5) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_top_courses(?, ?, ?)',
      [startDate, endDate, limit]
    );

    return rows[0] || [];
  } catch (error) {
    console.error('Dashboard Service - getTopCourses error:', error);
    throw error;
  }
};

/**
 * Get admin tasks
 * @param {number} adminId - Admin user ID (optional)
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {number} limit - Number of tasks to return (default 10)
 * @returns {Promise<Array>} Array of task objects
 */
const getTasks = async (adminId = null, startDate = null, endDate = null, limit = 10) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_admin_tasks(?, ?, ?, ?)',
      [adminId, startDate, endDate, limit]
    );

    return rows[0] || [];
  } catch (error) {
    console.error('Dashboard Service - getTasks error:', error);
    throw error;
  }
};

/**
 * Get learning hours trend for chart
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Array>} Array of weekly hour objects
 */
const getLearningHours = async (startDate = null, endDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_learning_hours_trend(?, ?)',
      [startDate, endDate]
    );

    return rows[0] || [];
  } catch (error) {
    console.error('Dashboard Service - getLearningHours error:', error);
    throw error;
  }
};

/**
 * Get learning progress for current month
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Object>} Progress object with hours, percentage, trend
 */
const getLearningProgress = async (startDate = null, endDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_learning_progress(?, ?)',
      [startDate, endDate]
    );

    // Return first row as object
    return rows[0]?.[0] || {
      totalHours: 0,
      progressPercentage: 0,
      trend: 'neutral',
      trendValue: 0,
      currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  } catch (error) {
    console.error('Dashboard Service - getLearningProgress error:', error);
    throw error;
  }
};

/**
 * Perform action on a task
 * @param {number} taskId - Task ID
 * @param {string} action - Action to perform (approve, reject, remind)
 * @param {number} adminId - Admin user ID performing the action
 * @returns {Promise<Object>} Result object with success status and message
 */
const performTaskAction = async (taskId, action, adminId = null) => {
  try {
    // Validate action
    const validActions = ['approve', 'reject', 'remind'];
    if (!validActions.includes(action.toLowerCase())) {
      return {
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      };
    }

    const [rows] = await pool.query(
      'CALL sp_perform_task_action(?, ?, ?)',
      [taskId, action.toLowerCase(), adminId]
    );

    const result = rows[0]?.[0];
    return {
      success: result?.success === 1 || result?.success === true,
      message: result?.message || 'Action completed'
    };
  } catch (error) {
    console.error('Dashboard Service - performTaskAction error:', error);
    throw error;
  }
};

/**
 * Get a single task by ID
 * @param {number} taskId - Task ID
 * @returns {Promise<Object|null>} Task object or null
 */
const getTaskById = async (taskId) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        id,
        task_type as type,
        status,
        description,
        DATE_FORMAT(due_date, '%b %d, %Y') as dueDate,
        action_label as action,
        related_entity_type,
        related_entity_id,
        created_at,
        updated_at
      FROM admin_tasks
      WHERE id = ?`,
      [taskId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error('Dashboard Service - getTaskById error:', error);
    throw error;
  }
};

/**
 * Log learning hours for a user
 * @param {number} userId - User ID
 * @param {Date} logDate - Date of learning
 * @param {number} hours - Hours spent
 * @param {number} courseId - Course ID (optional)
 * @returns {Promise<Object>} Result object
 */
const logLearningHours = async (userId, logDate, hours, courseId = null) => {
  try {
    await pool.query(
      `INSERT INTO learning_hours_log (user_id, log_date, hours_spent, course_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         hours_spent = hours_spent + VALUES(hours_spent),
         updated_at = NOW()`,
      [userId, logDate, hours, courseId]
    );

    return { success: true, message: 'Learning hours logged successfully' };
  } catch (error) {
    console.error('Dashboard Service - logLearningHours error:', error);
    throw error;
  }
};

/**
 * Get organizations that the admin belongs to
 * @param {string} userId - Admin user UUID
 * @returns {Promise<Array>} Array of organization objects
 */
const getAdminOrganizations = async (userId) => {
  try {
    console.log('🔍 Service - getAdminOrganizations called with userId:', userId);

    const [rows] = await pool.query(
      `SELECT
        o.id,
        o.name,
        o.is_active,
        o.created_at,
        uo.assigned_at
      FROM user_organizations uo
      INNER JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = ?
      ORDER BY uo.assigned_at DESC`,
      [userId]
    );

    console.log('📊 Service - Query returned', rows.length, 'organizations');

    if (rows.length === 0) {
      console.warn('⚠️ No organizations found for userId:', userId);
      console.warn('💡 This admin user may not be assigned to any organization in user_organizations table');
    }

    return rows || [];
  } catch (error) {
    console.error('❌ Dashboard Service - getAdminOrganizations error:', error);
    throw error;
  }
};

/**
 * Get organization-specific dashboard statistics
 * @param {number} organizationId - Organization ID
 * @returns {Promise<Object>} Organization stats object
 */
const getOrganizationStats = async (organizationId) => {
  try {
    // Total users in the organization
    const [[{ total_users }]] = await pool.query(
      `SELECT COUNT(DISTINCT uo.user_id) as total_users
       FROM user_organizations uo
       INNER JOIN users u ON uo.user_id = u.uuid
       WHERE uo.organization_id = ?
         AND u.is_deleted = 0`,
      [organizationId]
    );

    // Active users (status='active')
    const [[{ active_users }]] = await pool.query(
      `SELECT COUNT(DISTINCT uo.user_id) as active_users
       FROM user_organizations uo
       INNER JOIN users u ON uo.user_id = u.uuid
       WHERE uo.organization_id = ?
         AND u.status = 'active'
         AND u.is_deleted = 0`,
      [organizationId]
    );

    // Inactive users (status='inactive')
    const [[{ inactive_users }]] = await pool.query(
      `SELECT COUNT(DISTINCT uo.user_id) as inactive_users
       FROM user_organizations uo
       INNER JOIN users u ON uo.user_id = u.uuid
       WHERE uo.organization_id = ?
         AND u.status = 'inactive'
         AND u.is_deleted = 0`,
      [organizationId]
    );

    // Users by role - using CASE to map role_id to role names
    const [usersByRole] = await pool.query(
      `SELECT
        CASE u.role_id
          WHEN 1 THEN 'Student'
          WHEN 2 THEN 'Instructor'
          WHEN 3 THEN 'Admin'
          WHEN 4 THEN 'Super Admin'
          ELSE 'Unknown'
        END as role_name,
        COUNT(DISTINCT uo.user_id) as count
       FROM user_organizations uo
       INNER JOIN users u ON uo.user_id = u.uuid
       WHERE uo.organization_id = ?
         AND u.is_deleted = 0
       GROUP BY u.role_id
       ORDER BY u.role_id`,
      [organizationId]
    );

    // Organization details
    const [[organization]] = await pool.query(
      `SELECT
        id,
        name,
        is_active,
        created_at
      FROM organizations
      WHERE id = ?`,
      [organizationId]
    );

    return {
      organization: organization || null,
      totalUsers: total_users || 0,
      activeUsers: active_users || 0,
      inactiveUsers: inactive_users || 0,
      usersByRole: usersByRole || [],
      stats: [
        {
          title: 'Total Users',
          value: total_users || 0,
          iconType: 'users'
        },
        {
          title: 'Active Users',
          value: active_users || 0,
          iconType: 'user-check'
        },
        {
          title: 'Inactive Users',
          value: inactive_users || 0,
          iconType: 'user-x'
        },
        {
          title: 'Organization Status',
          value: organization?.is_active ? 'Active' : 'Inactive',
          iconType: organization?.is_active ? 'check-circle' : 'alert-circle'
        }
      ]
    };
  } catch (error) {
    console.error('Dashboard Service - getOrganizationStats error:', error);
    throw error;
  }
};

/**
 * Get all users in an organization
 * @param {number} organizationId - Organization ID
 * @param {Object} options - Query options (page, limit, search, roleFilter)
 * @returns {Promise<Object>} Users data with pagination
 */
const getOrganizationUsers = async (organizationId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      roleFilter = null
    } = options;

    const offset = (page - 1) * limit;

    // Build WHERE clause conditions
    const conditions = ['uo.organization_id = ?', 'u.is_deleted = 0'];
    const params = [organizationId];

    // Add search filter
    if (search) {
      conditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR i.first_name LIKE ? OR i.last_name LIKE ? OR a.first_name LIKE ? OR a.last_name LIKE ? OR u.email LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Add role filter
    if (roleFilter) {
      conditions.push('u.role_id = ?');
      params.push(roleFilter);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT uo.user_id) as total
       FROM user_organizations uo
       INNER JOIN users u ON uo.user_id = u.uuid
       LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN admins a ON u.uuid = a.user_id AND u.role_id = 2
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 3
       WHERE ${whereClause}`,
      params
    );

    // Get users with pagination
    const [users] = await pool.query(
      `SELECT
        u.uuid as id,
        COALESCE(s.first_name, a.first_name, i.first_name, '') as first_name,
        COALESCE(s.last_name, a.last_name, i.last_name, '') as last_name,
        u.email,
        u.role_id,
        CASE u.role_id
          WHEN 1 THEN 'Student'
          WHEN 2 THEN 'Admin'
          WHEN 3 THEN 'Instructor'
          WHEN 4 THEN 'Super Admin'
          ELSE 'Unknown'
        END as role_name,
        u.status,
        u.created_at,
        uo.assigned_at
      FROM user_organizations uo
      INNER JOIN users u ON uo.user_id = u.uuid
      LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
      LEFT JOIN admins a ON u.uuid = a.user_id AND u.role_id = 2
      LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 3
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      users: users || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    };
  } catch (error) {
    console.error('Dashboard Service - getOrganizationUsers error:', error);
    throw error;
  }
};

/**
 * Comprehensive org-centered overview for the admin dashboard.
 *
 * @param {string} callerUuid
 * @param {number} roleId
 * @param {number|null} focusOrgId — when set, scope to a single org (still
 *        gated by caller membership unless super-admin).
 *
 * Returns:
 *   {
 *     scope: { orgIds, organizationId, organizationName },
 *     members:    { totalUsers, activeUsers, inactiveUsers, newThisMonth },
 *     teams:      { totalTeams, withManager, withoutManager },
 *     assignments:{ active, upcoming, expired, total, pendingSubmissions },
 *     recent:     { assignments: [...], submissions: [...] }
 *   }
 */
const ROLE_SUPER_ADMIN = 4;

const _getCallerOrgIds = async (uuid) => {
  const [rows] = await pool.query(
    'SELECT organization_id FROM user_organizations WHERE user_id = ?',
    [uuid]
  );
  return rows.map((r) => r.organization_id);
};

const getOrgOverview = async (callerUuid, roleId, focusOrgId = null) => {
  // 1) Resolve which org IDs we're aggregating over.
  let orgIds;
  let scopeOrgRow = null;

  if (focusOrgId) {
    const id = Number(focusOrgId);
    if (roleId !== ROLE_SUPER_ADMIN) {
      const callerOrgs = await _getCallerOrgIds(callerUuid);
      if (!callerOrgs.includes(id)) {
        const err = new Error('You do not have access to this organization');
        err.statusCode = 403;
        throw err;
      }
    }
    orgIds = [id];
    const [rows] = await pool.query('SELECT id, name FROM organizations WHERE id = ?', [id]);
    scopeOrgRow = rows[0] || null;
  } else if (roleId === ROLE_SUPER_ADMIN) {
    // Super-admin without focusOrgId → aggregate across the whole platform
    orgIds = null;
  } else {
    orgIds = await _getCallerOrgIds(callerUuid);
    if (orgIds.length === 0) {
      // Admin not yet assigned any org — return zeroed shape rather than 500.
      return {
        scope: { orgIds: [], organizationId: null, organizationName: null },
        members: { totalUsers: 0, activeUsers: 0, inactiveUsers: 0, newThisMonth: 0 },
        teams: { totalTeams: 0, withManager: 0, withoutManager: 0 },
        assignments: { active: 0, upcoming: 0, expired: 0, total: 0, pendingSubmissions: 0 },
        recent: { assignments: [], submissions: [] }
      };
    }
  }

  // SQL fragment: filter by orgIds (or no-op for super-admin global).
  // For "users who are in the org" we go via user_organizations.
  const userInOrgFilter = orgIds && orgIds.length > 0
    ? `AND u.uuid IN (
         SELECT user_id FROM user_organizations
         WHERE organization_id IN (${orgIds.map(() => '?').join(',')})
       )`
    : '';
  const userInOrgParams = orgIds && orgIds.length > 0 ? orgIds : [];

  // For "teams in the org" — direct on teams.organization_id.
  const teamInOrgFilter = orgIds && orgIds.length > 0
    ? `AND t.organization_id IN (${orgIds.map(() => '?').join(',')})`
    : '';
  const teamInOrgParams = orgIds && orgIds.length > 0 ? orgIds : [];

  // For "assignments in the org" — by scope=organization OR team in org.
  // Plus, assignments created by an admin in our orgs.
  const assignmentInOrgFilter = orgIds && orgIds.length > 0
    ? `AND (
         a.organization_id IN (${orgIds.map(() => '?').join(',')})
         OR a.team_id IN (
           SELECT id FROM teams WHERE organization_id IN (${orgIds.map(() => '?').join(',')})
         )
       )`
    : '';
  const assignmentInOrgParams = orgIds && orgIds.length > 0 ? [...orgIds, ...orgIds] : [];

  // 2) Members
  const [memberRows] = await pool.query(
    `SELECT
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) AS activeUsers,
        SUM(CASE WHEN u.status != 'active' THEN 1 ELSE 0 END) AS inactiveUsers,
        SUM(CASE WHEN u.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS newThisMonth
       FROM users u
       WHERE u.is_deleted = 0 ${userInOrgFilter}`,
    userInOrgParams
  );
  const members = {
    totalUsers: Number(memberRows[0]?.totalUsers) || 0,
    activeUsers: Number(memberRows[0]?.activeUsers) || 0,
    inactiveUsers: Number(memberRows[0]?.inactiveUsers) || 0,
    newThisMonth: Number(memberRows[0]?.newThisMonth) || 0
  };

  // 3) Teams
  const [teamRows] = await pool.query(
    `SELECT
        COUNT(*) AS totalTeams,
        SUM(CASE WHEN t.manager_id IS NOT NULL THEN 1 ELSE 0 END) AS withManager,
        SUM(CASE WHEN t.manager_id IS NULL THEN 1 ELSE 0 END) AS withoutManager
       FROM teams t
       WHERE t.is_deleted = 0 ${teamInOrgFilter}`,
    teamInOrgParams
  );
  const teams = {
    totalTeams: Number(teamRows[0]?.totalTeams) || 0,
    withManager: Number(teamRows[0]?.withManager) || 0,
    withoutManager: Number(teamRows[0]?.withoutManager) || 0
  };

  // 4) Assignments — counts by lifecycle bucket
  const [assignmentRows] = await pool.query(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN NOW() BETWEEN a.start_date AND a.end_date THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN a.start_date > NOW() THEN 1 ELSE 0 END) AS upcoming,
        SUM(CASE WHEN a.end_date < NOW() THEN 1 ELSE 0 END) AS expired
       FROM assignments a
       WHERE a.is_deleted = 0 ${assignmentInOrgFilter}`,
    assignmentInOrgParams
  );

  // 4b) Pending submissions — submissions in 'submitted' state for assignments in scope.
  const [pendingRows] = await pool.query(
    `SELECT COUNT(*) AS pending
       FROM assignment_submissions s
       INNER JOIN assignments a ON s.assignment_id = a.id
       WHERE s.status = 'submitted' AND a.is_deleted = 0 ${assignmentInOrgFilter}`,
    assignmentInOrgParams
  );

  const assignments = {
    total: Number(assignmentRows[0]?.total) || 0,
    active: Number(assignmentRows[0]?.active) || 0,
    upcoming: Number(assignmentRows[0]?.upcoming) || 0,
    expired: Number(assignmentRows[0]?.expired) || 0,
    pendingSubmissions: Number(pendingRows[0]?.pending) || 0
  };

  // 5) Recent assignments (last 5)
  const [recentAssignments] = await pool.query(
    `SELECT a.id, a.uuid, a.title, a.type, a.scope, a.start_date, a.end_date, a.created_at,
            (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submission_count
       FROM assignments a
       WHERE a.is_deleted = 0 ${assignmentInOrgFilter}
       ORDER BY a.created_at DESC
       LIMIT 5`,
    assignmentInOrgParams
  );

  // 6) Recent submissions (last 10)
  const [recentSubmissions] = await pool.query(
    `SELECT
        s.id, s.uuid, s.assignment_id, s.user_id,
        s.submission_type, s.status, s.submitted_at,
        a.uuid AS assignment_uuid, a.title AS assignment_title,
        u.email AS user_email,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ',
          COALESCE(st.first_name, ad.first_name, ins.first_name, sa.first_name),
          COALESCE(st.last_name,  ad.last_name,  ins.last_name,  sa.last_name)
        )), ''), u.email) AS user_name
       FROM assignment_submissions s
       INNER JOIN assignments a ON s.assignment_id = a.id
       INNER JOIN users u ON s.user_id = u.uuid
       LEFT JOIN students      st  ON u.uuid = st.user_id
       LEFT JOIN admins        ad  ON u.uuid = ad.user_id
       LEFT JOIN instructors   ins ON u.uuid = ins.user_id
       LEFT JOIN super_admins  sa  ON u.uuid = sa.user_id
       WHERE a.is_deleted = 0 ${assignmentInOrgFilter}
       ORDER BY s.submitted_at DESC
       LIMIT 10`,
    assignmentInOrgParams
  );

  return {
    scope: {
      orgIds: orgIds || [],
      organizationId: scopeOrgRow ? scopeOrgRow.id : (orgIds && orgIds.length === 1 ? orgIds[0] : null),
      organizationName: scopeOrgRow ? scopeOrgRow.name : null
    },
    members,
    teams,
    assignments,
    recent: {
      assignments: recentAssignments,
      submissions: recentSubmissions
    }
  };
};

module.exports = {
  getStats,
  calculateAndSaveDailyStats,
  getTopCourses,
  getTasks,
  getLearningHours,
  getLearningProgress,
  performTaskAction,
  getTaskById,
  logLearningHours,
  getAdminOrganizations,
  getOrganizationStats,
  getOrganizationUsers,
  getOrgOverview
};
