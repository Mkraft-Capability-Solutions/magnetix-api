const { promisePool: pool } = require('../../config/db');
const reportGenerator = require('../../utils/report_generator');

/**
 * Instructor Report Service
 * Handles all business logic for instructor report generation and data retrieval
 * Uses stored procedures to filter data by instructor's courses only
 */

/**
 * Get leaderboard data - top performers in instructor's courses
 * @param {string} instructorId - Instructor UUID
 * @param {number} limit - Number of top performers to return
 * @returns {Promise<Array>} Array of leaderboard entries
 */
const getLeaderboard = async (instructorId, limit = 50) => {
  try {
    const [rows] = await pool.query('CALL sp_get_report_leaderboard(?, ?)', [instructorId, limit]);
    return rows[0] || [];
  } catch (error) {
    console.error('Instructor Report Service - getLeaderboard error:', error);
    throw error;
  }
};

/**
 * Get department performance data for instructor's students
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of department performance objects
 */
const getDepartmentPerformance = async (instructorId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_department_performance(?)', [instructorId]);
    return rows[0] || [];
  } catch (error) {
    console.error('Instructor Report Service - getDepartmentPerformance error:', error);
    throw error;
  }
};

/**
 * Get completion trends data for instructor's courses (last 6 months)
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of monthly trend data
 */
const getCompletionTrends = async (instructorId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_completion_trends(?)', [instructorId]);
    return rows[0] || [];
  } catch (error) {
    console.error('Instructor Report Service - getCompletionTrends error:', error);
    throw error;
  }
};

/**
 * Get certification distribution data for instructor's courses
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of certification type distributions
 */
const getCertificationDistribution = async (instructorId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_certification_distribution(?)', [instructorId]);
    return rows[0] || [];
  } catch (error) {
    console.error('Instructor Report Service - getCertificationDistribution error:', error);
    throw error;
  }
};

/**
 * Get user report data for export (instructor's students)
 * @param {string} instructorId - Instructor UUID
 * @param {Date} fromDate - Start date filter
 * @param {Date} toDate - End date filter
 * @param {string} department - Department filter
 * @returns {Promise<Array>} Array of user data
 */
const getUserReportData = async (instructorId, fromDate = null, toDate = null, department = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_user_report_data(?, ?, ?, ?)',
      [instructorId, fromDate, toDate, department]
    );
    return rows[0] || [];
  } catch (error) {
    console.error('Instructor Report Service - getUserReportData error:', error);
    throw error;
  }
};

/**
 * Get course completion report data for instructor's courses
 * @param {string} instructorId - Instructor UUID
 * @param {Date} fromDate - Start date filter
 * @param {Date} toDate - End date filter
 * @returns {Promise<Array>} Array of course completion data
 */
const getCourseCompletionData = async (instructorId, fromDate = null, toDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_course_completion_report(?, ?, ?)',
      [instructorId, fromDate, toDate]
    );
    return rows[0] || [];
  } catch (error) {
    console.error('Instructor Report Service - getCourseCompletionData error:', error);
    throw error;
  }
};

/**
 * Get learning engagement report data for instructor's students
 * @param {string} instructorId - Instructor UUID
 * @param {Date} fromDate - Start date filter
 * @param {Date} toDate - End date filter
 * @returns {Promise<Object>} Engagement summary object
 */
const getLearningEngagementData = async (instructorId, fromDate = null, toDate = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_learning_engagement_report(?, ?, ?)',
      [instructorId, fromDate, toDate]
    );
    return rows[0]?.[0] || null;
  } catch (error) {
    console.error('Instructor Report Service - getLearningEngagementData error:', error);
    throw error;
  }
};

/**
 * Get skills assessment data for instructor's courses
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of skill scores
 */
const getSkillsAssessmentData = async (instructorId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_skills_assessment(?)', [instructorId]);
    return rows[0] || [];
  } catch (error) {
    console.error('Instructor Report Service - getSkillsAssessmentData error:', error);
    throw error;
  }
};

/**
 * Generate and save a report file for instructor
 * @param {string} instructorId - Instructor UUID
 * @param {string} reportType - Type of report (user, course-completion, learning-engagement, skills-assessment)
 * @param {string} format - Output format (pdf, excel, csv)
 * @param {Object} options - Additional options (dateRange, department)
 * @returns {Promise<Object>} Generated file info
 */
const generateReport = async (instructorId, reportType, format, options = {}) => {
  try {
    let data;
    let title;

    // Get data based on report type
    switch (reportType) {
      case 'user':
        title = 'User Report';
        data = await getUserReportData(
          instructorId,
          options.dateRange?.from,
          options.dateRange?.to,
          options.department
        );
        break;

      case 'course-completion':
        title = 'Course Completion Report';
        data = await getCourseCompletionData(
          instructorId,
          options.dateRange?.from,
          options.dateRange?.to
        );
        break;

      case 'learning-engagement':
        title = 'Learning Engagement Report';
        const engagementData = await getLearningEngagementData(
          instructorId,
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
        data = await getSkillsAssessmentData(instructorId);
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
    console.error('Instructor Report Service - generateReport error:', error);
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
  generateReport
};
