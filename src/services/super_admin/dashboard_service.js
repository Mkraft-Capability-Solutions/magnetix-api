const { promisePool: pool } = require('../../config/db');

/**
 * Super Admin Dashboard Service
 * Handles all business logic for super admin dashboard operations
 */

/**
 * Get dashboard statistics for super admin
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Array>} Array of stat objects
 */
const getStats = async (startDate = null, endDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_super_admin_dashboard_stats(?, ?)',
      [startDate, endDate]
    );

    // The result is nested, first element contains the data
    return rows[0] || [];
  } catch (error) {
    console.error('Super Admin Dashboard Service - getStats error:', error);
    throw error;
  }
};

/**
 * Get top courses by enrollment across all organizations
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {number} limit - Number of courses to return (default 5)
 * @returns {Promise<Array>} Array of course objects
 */
const getTopCourses = async (startDate = null, endDate = null, limit = 5) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_super_admin_top_courses(?, ?, ?)',
      [startDate, endDate, limit]
    );

    return rows[0] || [];
  } catch (error) {
    console.error('Super Admin Dashboard Service - getTopCourses error:', error);
    throw error;
  }
};

/**
 * Get super admin tasks
 * @param {number} superAdminId - Super Admin user ID (optional)
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {number} limit - Number of tasks to return (default 10)
 * @returns {Promise<Array>} Array of task objects
 */
const getTasks = async (superAdminId = null, startDate = null, endDate = null, limit = 10) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_super_admin_tasks(?, ?, ?, ?)',
      [superAdminId, startDate, endDate, limit]
    );

    return rows[0] || [];
  } catch (error) {
    console.error('Super Admin Dashboard Service - getTasks error:', error);
    throw error;
  }
};

/**
 * Get learning hours trend for chart across all organizations
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Array>} Array of weekly hour objects
 */
const getLearningHours = async (startDate = null, endDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_super_admin_learning_hours_trend(?, ?)',
      [startDate, endDate]
    );

    return rows[0] || [];
  } catch (error) {
    console.error('Super Admin Dashboard Service - getLearningHours error:', error);
    throw error;
  }
};

/**
 * Get learning progress for current month across all organizations
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Object>} Progress object with hours, percentage, trend
 */
const getLearningProgress = async (startDate = null, endDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_super_admin_learning_progress(?, ?)',
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
    console.error('Super Admin Dashboard Service - getLearningProgress error:', error);
    throw error;
  }
};

/**
 * Perform action on a task
 * @param {number} taskId - Task ID
 * @param {string} action - Action to perform (approve, reject, remind)
 * @param {number} superAdminId - Super Admin user ID performing the action
 * @returns {Promise<Object>} Result object with success status and message
 */
const performTaskAction = async (taskId, action, superAdminId = null) => {
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
      'CALL sp_perform_super_admin_task_action(?, ?, ?)',
      [taskId, action.toLowerCase(), superAdminId]
    );

    const result = rows[0]?.[0];
    return {
      success: result?.success === 1 || result?.success === true,
      message: result?.message || 'Action completed'
    };
  } catch (error) {
    console.error('Super Admin Dashboard Service - performTaskAction error:', error);
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
      FROM super_admin_tasks
      WHERE id = ?`,
      [taskId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error('Super Admin Dashboard Service - getTaskById error:', error);
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
    console.error('Super Admin Dashboard Service - logLearningHours error:', error);
    throw error;
  }
};

module.exports = {
  getStats,
  getTopCourses,
  getTasks,
  getLearningHours,
  getLearningProgress,
  performTaskAction,
  getTaskById,
  logLearningHours
};
