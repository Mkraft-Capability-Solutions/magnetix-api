const { promisePool: pool } = require('../../config/db');
const reportGenerator = require('../../utils/report_generator');

/**
 * Admin Report Service
 * Handles all business logic for report generation and data retrieval
 */

/**
 * Get leaderboard data - top performers
 * @param {number} limit - Number of top performers to return
 * @returns {Promise<Array>} Array of leaderboard entries
 */
const getLeaderboard = async (limit = 50) => {
  try {
    const [rows] = await pool.query('CALL sp_get_report_leaderboard(?)', [limit]);
    return rows[0] || [];
  } catch (error) {
    console.error('Report Service - getLeaderboard error:', error);
    throw error;
  }
};

/**
 * Get department performance data
 * @returns {Promise<Array>} Array of department performance objects
 */
const getDepartmentPerformance = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_department_performance()');
    return rows[0] || [];
  } catch (error) {
    console.error('Report Service - getDepartmentPerformance error:', error);
    throw error;
  }
};

/**
 * Get completion trends data (last 6 months)
 * @returns {Promise<Array>} Array of monthly trend data
 */
const getCompletionTrends = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_completion_trends()');
    return rows[0] || [];
  } catch (error) {
    console.error('Report Service - getCompletionTrends error:', error);
    throw error;
  }
};

/**
 * Get certification distribution data
 * @returns {Promise<Array>} Array of certification type distributions
 */
const getCertificationDistribution = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_certification_distribution()');
    return rows[0] || [];
  } catch (error) {
    console.error('Report Service - getCertificationDistribution error:', error);
    throw error;
  }
};

/**
 * Get user report data for export
 * @param {Date} fromDate - Start date filter
 * @param {Date} toDate - End date filter
 * @param {string} department - Department filter
 * @returns {Promise<Array>} Array of user data
 */
const getUserReportData = async (fromDate = null, toDate = null, department = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_user_report_data(?, ?, ?)',
      [fromDate, toDate, department]
    );
    return rows[0] || [];
  } catch (error) {
    console.error('Report Service - getUserReportData error:', error);
    throw error;
  }
};

/**
 * Get course completion report data
 * @param {Date} fromDate - Start date filter
 * @param {Date} toDate - End date filter
 * @returns {Promise<Array>} Array of course completion data
 */
const getCourseCompletionData = async (fromDate = null, toDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_course_completion_report(?, ?)',
      [fromDate, toDate]
    );
    return rows[0] || [];
  } catch (error) {
    console.error('Report Service - getCourseCompletionData error:', error);
    throw error;
  }
};

/**
 * Get learning engagement report data
 * @param {Date} fromDate - Start date filter
 * @param {Date} toDate - End date filter
 * @returns {Promise<Object>} Engagement summary object
 */
const getLearningEngagementData = async (fromDate = null, toDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_learning_engagement_report(?, ?)',
      [fromDate, toDate]
    );
    return rows[0]?.[0] || null;
  } catch (error) {
    console.error('Report Service - getLearningEngagementData error:', error);
    throw error;
  }
};

/**
 * Get skills assessment data (based on course categories)
 * @returns {Promise<Array>} Array of skill scores
 */
const getSkillsAssessmentData = async () => {
  try {
    // Get skill scores based on course category and lesson completion progress
    const [rows] = await pool.query(`
      SELECT
        cat.category_name as skill,
        ROUND(
          COALESCE(
            SUM(cp.lesson_completed) * 100.0 / NULLIF(COUNT(cp.id), 0),
            0
          ),
          0
        ) as score,
        COUNT(DISTINCT e.user_id) as usersAssessed
      FROM category cat
      LEFT JOIN course c ON c.category_id = cat.id AND c.is_deleted = 0
      LEFT JOIN enrol e ON e.course_id = c.id
      LEFT JOIN course_progress cp ON cp.enroll_id = e.id
      GROUP BY cat.id, cat.category_name
      HAVING COUNT(DISTINCT e.user_id) > 0
      ORDER BY score DESC
      LIMIT 6
    `);
    return rows || [];
  } catch (error) {
    console.error('Report Service - getSkillsAssessmentData error:', error);
    throw error;
  }
};

/**
 * Generate and save a report file
 * @param {string} reportType - Type of report (user, course-completion, learning-engagement, skills-assessment)
 * @param {string} format - Output format (pdf, excel, csv)
 * @param {Object} options - Additional options (dateRange, department)
 * @returns {Promise<Object>} Generated file info
 */
const generateReport = async (reportType, format, options = {}) => {
  try {
    let data;
    let title;

    // Get data based on report type
    switch (reportType) {
      case 'user':
        title = 'User Report';
        data = await getUserReportData(
          options.dateRange?.from,
          options.dateRange?.to,
          options.department
        );
        break;

      case 'course-completion':
        title = 'Course Completion Report';
        data = await getCourseCompletionData(
          options.dateRange?.from,
          options.dateRange?.to
        );
        break;

      case 'learning-engagement':
        title = 'Learning Engagement Report';
        const engagementData = await getLearningEngagementData(
          options.dateRange?.from,
          options.dateRange?.to
        );
        // Convert to array format for report
        if (engagementData) {
          data = [
            { metric: 'Total Active Users', value: engagementData.totalActiveUsers },
            { metric: 'Users with Enrollments', value: engagementData.usersWithEnrollments },
            { metric: 'Total Enrollments', value: engagementData.totalEnrollments },
            { metric: 'Total Time Spent (minutes)', value: engagementData.totalTimeSpentMinutes },
            { metric: 'Average Time per User (minutes)', value: engagementData.avgTimePerUser },
            { metric: 'Active Last Week', value: engagementData.activeLastWeek }
          ];
        } else {
          data = [];
        }
        break;

      case 'skills-assessment':
        title = 'Skills Assessment Report';
        data = await getSkillsAssessmentData();
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Generate the report file
    const result = await reportGenerator.generateReport(
      reportType,
      format,
      title,
      data,
      options
    );

    return {
      success: true,
      ...result,
      recordCount: Array.isArray(data) ? data.length : 1
    };
  } catch (error) {
    console.error('Report Service - generateReport error:', error);
    throw error;
  }
};

/**
 * Get all dashboard analytics data in one call
 * @returns {Promise<Object>} Combined analytics data
 */
const getDashboardAnalytics = async () => {
  try {
    const [leaderboard, departmentPerformance, completionTrends, certificationDistribution] =
      await Promise.all([
        getLeaderboard(10),
        getDepartmentPerformance(),
        getCompletionTrends(),
        getCertificationDistribution()
      ]);

    return {
      leaderboard,
      departmentPerformance,
      completionTrends,
      certificationDistribution
    };
  } catch (error) {
    console.error('Report Service - getDashboardAnalytics error:', error);
    throw error;
  }
};

module.exports = {
  getLeaderboard,
  getDepartmentPerformance,
  getCompletionTrends,
  getCertificationDistribution,
  getUserReportData,
  getCourseCompletionData,
  getLearningEngagementData,
  getSkillsAssessmentData,
  generateReport,
  getDashboardAnalytics
};
