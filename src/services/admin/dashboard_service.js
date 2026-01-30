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
 * Get dashboard statistics for a specific date
 * @param {Date|string} date - Date to retrieve stats for (defaults to today)
 * @returns {Promise<Array>} Array of stat objects with increase percentages
 */
const getStats = async (date = null) => {
  try {
    // Set default to today if no date provided
    if (!date) {
      date = new Date();
    }

    // Convert to YYYY-MM-DD format
    const statDate = typeof date === 'string'
      ? date
      : date.toISOString().split('T')[0];

    // Get stats for the selected date
    const [[currentStats]] = await pool.query(
      `SELECT
        active_learners,
        courses_in_progress,
        overdue_assignments,
        pending_approvals,
        stat_date
       FROM admin_dashboard_stats
       WHERE stat_date = ?`,
      [statDate]
    );

    // If no stats found for this date, return empty result
    if (!currentStats) {
      return [];
    }

    // Get stats from 7 days ago for comparison
    const prevDate = new Date(statDate);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const [[prevStats]] = await pool.query(
      `SELECT
        active_learners,
        courses_in_progress,
        overdue_assignments,
        pending_approvals
       FROM admin_dashboard_stats
       WHERE stat_date = ?`,
      [prevDateStr]
    );

    // Calculate increase percentage
    const calculateIncrease = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? '100%' : '0%';
      const increase = Math.round(Math.abs((current - previous) / previous) * 100);
      return `${increase}%`;
    };

    // Default previous values to 0 if not found
    const prevActiveLearners = prevStats?.active_learners || 0;
    const prevCoursesInProgress = prevStats?.courses_in_progress || 0;
    const prevOverdueAssignments = prevStats?.overdue_assignments || 0;
    const prevPendingApprovals = prevStats?.pending_approvals || 0;

    // Return results
    return [
      {
        title: 'Active Learners',
        value: currentStats.active_learners || 0,
        increase: calculateIncrease(currentStats.active_learners, prevActiveLearners),
        iconType: 'users'
      },
      {
        title: 'Course in Progress',
        value: currentStats.courses_in_progress || 0,
        increase: calculateIncrease(currentStats.courses_in_progress, prevCoursesInProgress),
        iconType: 'book'
      },
      {
        title: 'Overdue Assignments',
        value: currentStats.overdue_assignments || 0,
        increase: calculateIncrease(currentStats.overdue_assignments, prevOverdueAssignments),
        iconType: 'alert'
      },
      {
        title: 'Pending Approvals',
        value: currentStats.pending_approvals || 0,
        increase: calculateIncrease(currentStats.pending_approvals, prevPendingApprovals),
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

module.exports = {
  getStats,
  calculateAndSaveDailyStats,
  getTopCourses,
  getTasks,
  getLearningHours,
  getLearningProgress,
  performTaskAction,
  getTaskById,
  logLearningHours
};
