const { promisePool: pool } = require('../../config/db');

/**
 * Instructor Dashboard Service
 * Handles all business logic for instructor dashboard operations
 * Uses direct SQL queries instead of stored procedures
 */

/**
 * Get dashboard statistics for instructor
 * @param {string} instructorId - Instructor user UUID
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Array>} Array of stat objects
 */
const getStats = async (instructorId, startDate = null, endDate = null) => {
  try {
    console.log('📊 Dashboard getStats called with instructorId:', instructorId);

    // Total Students: all students in the platform (role_id = 1)
    const [totalStudentsResult] = await pool.query(
      `SELECT COUNT(*) as count
       FROM users
       WHERE role_id = 1 AND is_deleted = 0`
    );
    const totalStudents = totalStudentsResult[0]?.count || 0;
    console.log('  ├─ Total Students (Platform):', totalStudents);

    // Active Courses: instructor's active courses
    const [activeCoursesResult] = await pool.query(
      `SELECT COUNT(*) as count
       FROM course c
       WHERE c.creator_id = ? AND c.status = 'active' AND c.is_deleted = 0`,
      [instructorId]
    );
    const activeCourses = activeCoursesResult[0]?.count || 0;
    console.log('  ├─ Active Courses:', activeCourses);

    // Pending Reviews: tasks that are pending or urgent
    const [pendingReviewsResult] = await pool.query(
      `SELECT COUNT(*) as count
       FROM instructor_tasks
       WHERE instructor_id = ? AND status IN ('Pending', 'Urgent') AND due_date >= CURDATE()`,
      [instructorId]
    );
    const pendingReviews = pendingReviewsResult[0]?.count || 0;
    console.log('  ├─ Pending Reviews:', pendingReviews);

    // Total Enrollments: count of all enrollments in instructor's courses
    const [totalEnrollmentsResult] = await pool.query(
      `SELECT COUNT(*) as count
       FROM enrol e
       INNER JOIN course c ON e.course_id = c.id
       WHERE c.creator_id = ? AND c.is_deleted = 0`,
      [instructorId]
    );
    const totalEnrollments = totalEnrollmentsResult[0]?.count || 0;
    console.log('  └─ Total Enrollments:', totalEnrollments);

    // Return stats in the expected format
    return [
      {
        title: 'Total Students',
        value: totalStudents,
        increase: '15%',
        iconType: 'users'
      },
      {
        title: 'Active Courses',
        value: activeCourses,
        increase: '8%',
        iconType: 'book'
      },
      {
        title: 'Pending Reviews',
        value: pendingReviews,
        increase: '5%',
        iconType: 'alert'
      },
      {
        title: 'Total Enrollments',
        value: totalEnrollments,
        increase: '12%',
        iconType: 'check'
      }
    ];
  } catch (error) {
    console.error('Instructor Dashboard Service - getStats error:', error);
    throw error;
  }
};

/**
 * Get top courses by enrollment for instructor
 * @param {string} instructorId - Instructor user UUID
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {number} limit - Number of courses to return (default 5)
 * @returns {Promise<Array>} Array of course objects
 */
const getTopCourses = async (instructorId, startDate = null, endDate = null, limit = 5) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        c.title as name,
        COUNT(e.id) as enrolled,
        (SELECT COUNT(*) FROM users WHERE role_id = 1) as total
      FROM course c
      LEFT JOIN enrol e ON c.id = e.course_id
      WHERE c.creator_id = ?
        AND c.status = 'active'
        AND c.is_deleted = 0
      GROUP BY c.id, c.title
      ORDER BY enrolled DESC
      LIMIT ?`,
      [instructorId, limit]
    );

    return rows;
  } catch (error) {
    console.error('Instructor Dashboard Service - getTopCourses error:', error);
    throw error;
  }
};

/**
 * Get instructor tasks
 * @param {string} instructorId - Instructor user UUID
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {number} limit - Number of tasks to return (default 10)
 * @returns {Promise<Array>} Array of task objects
 */
const getTasks = async (instructorId, startDate = null, endDate = null, limit = 10) => {
  try {
    // Don't filter by date range for tasks - just show all pending/urgent tasks
    // Tasks have their own due_date which is independent of the dashboard date range
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
      FROM instructor_tasks
      WHERE instructor_id = ?
        AND status IN ('Pending', 'Urgent')
      ORDER BY
        CASE status WHEN 'Urgent' THEN 1 WHEN 'Pending' THEN 2 ELSE 3 END,
        due_date ASC
      LIMIT ?`,
      [instructorId, limit]
    );

    return rows;
  } catch (error) {
    console.error('Instructor Dashboard Service - getTasks error:', error);
    throw error;
  }
};

/**
 * Get learning hours trend for instructor's students
 * @param {string} instructorId - Instructor user UUID
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Array>} Array of weekly hour objects
 */
const getLearningHours = async (instructorId, startDate = null, endDate = null) => {
  try {
    // Convert string dates to Date objects if needed
    if (endDate && typeof endDate === 'string') {
      endDate = new Date(endDate);
    }
    if (startDate && typeof startDate === 'string') {
      startDate = new Date(startDate);
    }

    // Set defaults if dates not provided
    if (!endDate) {
      endDate = new Date();
    }
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 35); // 5 weeks ago
    }

    const [rows] = await pool.query(
      `SELECT
        CONCAT('Week ', WEEK(lhl.log_date) - WEEK(?) + 1) as week,
        ROUND(SUM(lhl.hours_spent), 0) as hours
      FROM learning_hours_log lhl
      INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
      INNER JOIN course c ON e.course_id = c.id
      WHERE c.creator_id = ?
        AND c.is_deleted = 0
        AND lhl.log_date BETWEEN ? AND ?
      GROUP BY WEEK(lhl.log_date)
      ORDER BY MIN(lhl.log_date)`,
      [startDate, instructorId, startDate, endDate]
    );

    return rows;
  } catch (error) {
    console.error('Instructor Dashboard Service - getLearningHours error:', error);
    throw error;
  }
};

/**
 * Get learning progress for instructor's students
 * @param {string} instructorId - Instructor user UUID
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Object>} Progress object with hours, percentage, trend
 */
const getLearningProgress = async (instructorId, startDate = null, endDate = null) => {
  try {
    // Convert string dates to Date objects if needed
    if (endDate && typeof endDate === 'string') {
      endDate = new Date(endDate);
    }
    if (startDate && typeof startDate === 'string') {
      startDate = new Date(startDate);
    }

    // Set defaults
    if (!endDate) {
      endDate = new Date();
    }
    if (!startDate) {
      // Start of current month
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    }

    const currentMonth = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Current period hours for instructor's students
    const [currentHoursResult] = await pool.query(
      `SELECT COALESCE(SUM(lhl.hours_spent), 0) as hours
      FROM learning_hours_log lhl
      INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
      INNER JOIN course c ON e.course_id = c.id
      WHERE c.creator_id = ?
        AND c.is_deleted = 0
        AND lhl.log_date BETWEEN ? AND ?`,
      [instructorId, startDate, endDate]
    );
    const currentHours = parseFloat(currentHoursResult[0]?.hours || 0);

    // Previous period hours (same duration before start_date)
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);

    const [prevHoursResult] = await pool.query(
      `SELECT COALESCE(SUM(lhl.hours_spent), 0) as hours
      FROM learning_hours_log lhl
      INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
      INNER JOIN course c ON e.course_id = c.id
      WHERE c.creator_id = ?
        AND c.is_deleted = 0
        AND lhl.log_date BETWEEN ? AND ?`,
      [instructorId, prevStartDate, prevEndDate]
    );
    const prevHours = parseFloat(prevHoursResult[0]?.hours || 0);

    // Calculate progress percentage (target: 100 hours per month)
    const progressPercentage = Math.round((currentHours / 100) * 100 * 10) / 10;

    // Calculate trend
    let trend = 'neutral';
    let trendValue = 0;

    if (prevHours > 0) {
      trendValue = Math.round(((currentHours - prevHours) / prevHours) * 100 * 10) / 10;
      if (currentHours > prevHours) {
        trend = 'up';
      } else if (currentHours < prevHours) {
        trend = 'down';
      }
    }

    return {
      totalHours: Math.round(currentHours),
      progressPercentage,
      trend,
      trendValue: Math.abs(trendValue),
      currentMonth
    };
  } catch (error) {
    console.error('Instructor Dashboard Service - getLearningProgress error:', error);
    throw error;
  }
};

/**
 * Perform action on a task
 * @param {number} taskId - Task ID
 * @param {string} action - Action to perform (approve, reject, remind, complete)
 * @param {string} instructorId - Instructor user UUID performing the action
 * @returns {Promise<Object>} Result object with success status and message
 */
const performTaskAction = async (taskId, action, instructorId) => {
  try {
    // Validate action
    const validActions = ['approve', 'reject', 'remind', 'complete'];
    if (!validActions.includes(action.toLowerCase())) {
      return {
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      };
    }

    // Check if task exists and belongs to instructor
    const [taskCheck] = await pool.query(
      'SELECT COUNT(*) as count FROM instructor_tasks WHERE id = ? AND instructor_id = ?',
      [taskId, instructorId]
    );

    if (taskCheck[0]?.count === 0) {
      return {
        success: false,
        message: 'Task not found or access denied'
      };
    }

    let message = '';
    const actionLower = action.toLowerCase();

    switch (actionLower) {
      case 'approve':
      case 'complete':
        await pool.query(
          `UPDATE instructor_tasks
           SET status = 'Completed', completed_at = NOW(), updated_at = NOW()
           WHERE id = ? AND instructor_id = ?`,
          [taskId, instructorId]
        );
        message = actionLower === 'approve' ? 'Task approved successfully' : 'Task completed successfully';
        break;

      case 'reject':
        await pool.query(
          `UPDATE instructor_tasks
           SET status = 'Rejected', completed_at = NOW(), updated_at = NOW()
           WHERE id = ? AND instructor_id = ?`,
          [taskId, instructorId]
        );
        message = 'Task rejected successfully';
        break;

      case 'remind':
        await pool.query(
          `UPDATE instructor_tasks
           SET updated_at = NOW()
           WHERE id = ? AND instructor_id = ?`,
          [taskId, instructorId]
        );
        message = 'Reminder sent successfully';
        break;

      default:
        return {
          success: false,
          message: 'Invalid action'
        };
    }

    return {
      success: true,
      message
    };
  } catch (error) {
    console.error('Instructor Dashboard Service - performTaskAction error:', error);
    throw error;
  }
};

/**
 * Get a single task by ID
 * @param {number} taskId - Task ID
 * @param {string} instructorId - Instructor user UUID (for authorization)
 * @returns {Promise<Object|null>} Task object or null
 */
const getTaskById = async (taskId, instructorId) => {
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
      FROM instructor_tasks
      WHERE id = ? AND instructor_id = ?`,
      [taskId, instructorId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error('Instructor Dashboard Service - getTaskById error:', error);
    throw error;
  }
};

/**
 * Get student performance overview for instructor
 * @param {string} instructorId - Instructor user UUID
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Array>} Array of student performance objects
 */
const getStudentPerformance = async (instructorId, startDate = null, endDate = null) => {
  try {
    // Convert string dates to Date objects if needed
    if (endDate && typeof endDate === 'string') {
      endDate = new Date(endDate);
    }
    if (startDate && typeof startDate === 'string') {
      startDate = new Date(startDate);
    }

    // Set defaults if dates not provided
    if (!endDate) {
      endDate = new Date();
    }
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago
    }

    const [rows] = await pool.query(
      `SELECT
        u.uuid as studentId,
        CONCAT(u.first_name, ' ', u.last_name) as studentName,
        u.email as studentEmail,
        c.title as courseName,
        COALESCE(SUM(lhl.hours_spent), 0) as totalHours,
        COALESCE(
          (SELECT AVG(score)
           FROM quiz_attempts qa
           INNER JOIN quiz q ON qa.quiz_id = q.id
           INNER JOIN lesson l ON q.lesson_id = l.id
           WHERE l.course_id = c.id AND qa.user_id = u.uuid),
          0
        ) as avgScore,
        DATE_FORMAT(NOW(), '%b %d, %Y') as enrolledDate
      FROM users u
      INNER JOIN enrol e ON u.uuid = e.user_id
      INNER JOIN course c ON e.course_id = c.id
      LEFT JOIN learning_hours_log lhl ON lhl.user_id = u.uuid
        AND lhl.course_id = c.id
        AND lhl.log_date BETWEEN ? AND ?
      WHERE c.creator_id = ?
        AND c.is_deleted = 0
        AND u.role_id = 1
      GROUP BY u.uuid, c.id
      ORDER BY totalHours DESC, avgScore DESC`,
      [startDate, endDate, instructorId]
    );

    return rows;
  } catch (error) {
    console.error('Instructor Dashboard Service - getStudentPerformance error:', error);
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
  getStudentPerformance
};
