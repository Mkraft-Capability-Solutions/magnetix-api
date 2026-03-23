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
    const [rows] = await pool.query('CALL sp_get_report_leaderboard(?, ?)', [null, limit]);
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
    const [rows] = await pool.query('CALL sp_get_department_performance(?)', [null]);
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
    const [rows] = await pool.query('CALL sp_get_completion_trends(?)', [null]);
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
    const query = `
      SELECT
        type,
        percentage,
        CASE
          WHEN row_num = 1 THEN '#10b981'
          WHEN row_num = 2 THEN '#3b82f6'
          WHEN row_num = 3 THEN '#a855f7'
          ELSE '#f59e0b'
        END as color
      FROM (
        SELECT
          COALESCE(sc.certificate_name, 'Other') as type,
          ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM student_certificates), 0), 0) as percentage,
          ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as row_num
        FROM student_certificates sc
        GROUP BY COALESCE(sc.certificate_name, 'Other')
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) cert_data
    `;

    const [rows] = await pool.query(query);
    return rows || [];
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
      'CALL sp_get_user_report_data(?, ?, ?, ?)',
      [null, fromDate, toDate, department]
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
    let dateFilter = '';
    const params = [];
    if (fromDate) { dateFilter += ' AND e.enrolled_date >= ?'; params.push(fromDate); }
    if (toDate) { dateFilter += ' AND e.enrolled_date <= ?'; params.push(toDate); }

    const query = `
      SELECT
        c.id as courseId,
        c.title as courseTitle,
        COALESCE(cat.category_name, 'Uncategorized') as category,
        COUNT(DISTINCT e.user_id) as totalEnrollments,
        COUNT(DISTINCT CASE
          WHEN total_lessons.lesson_count > 0
            AND completed_lessons.completed_count >= total_lessons.lesson_count
          THEN e.user_id
        END) as completedCount,
        ROUND(
          COUNT(DISTINCT CASE
            WHEN total_lessons.lesson_count > 0
              AND completed_lessons.completed_count >= total_lessons.lesson_count
            THEN e.user_id
          END) * 100.0 /
          NULLIF(COUNT(DISTINCT e.user_id), 0),
          1
        ) as completionRate,
        COALESCE(ROUND(AVG(cp_time.time_spent), 1), 0) as avgTimeSpentMinutes,
        c.course_duration as courseDuration
      FROM course c
      LEFT JOIN enrol e ON c.id = e.course_id
      LEFT JOIN category cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT cl.course_id, COUNT(*) as lesson_count
        FROM course_lesson cl
        INNER JOIN course_section cs ON cl.section_id = cs.id
        WHERE cl.is_deleted = 0
        GROUP BY cl.course_id
      ) total_lessons ON c.id = total_lessons.course_id
      LEFT JOIN (
        SELECT cp.enroll_id, e2.course_id, COUNT(*) as completed_count
        FROM course_progress cp
        INNER JOIN enrol e2 ON cp.enroll_id = e2.id
        WHERE cp.lesson_completed = 1
        GROUP BY cp.enroll_id, e2.course_id
      ) completed_lessons ON e.id = completed_lessons.enroll_id AND c.id = completed_lessons.course_id
      LEFT JOIN (
        SELECT enroll_id, COALESCE(SUM(time_spent), 0) as time_spent
        FROM course_progress
        GROUP BY enroll_id
      ) cp_time ON e.id = cp_time.enroll_id
      WHERE c.is_deleted = 0
        ${dateFilter}
      GROUP BY c.id, c.title, cat.category_name, c.course_duration
      ORDER BY completionRate DESC
    `;

    const [rows] = await pool.query(query, params);
    return rows || [];
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
      'CALL sp_get_learning_engagement_report(?, ?, ?)',
      [null, fromDate, toDate]
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
    const [rows] = await pool.query('CALL sp_get_skills_assessment(?)', [null]);
    return rows[0] || [];
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

/**
 * Get daily active users over the past 30 days
 * @returns {Promise<Array>} Array of { date, activeUsers }
 */
const getLoginActivity = async () => {
  try {
    const query = `
      SELECT
        DATE_FORMAT(ll.login_date, '%Y-%m-%d') as date,
        COUNT(DISTINCT ll.user_id) as activeUsers
      FROM user_login_log ll
      WHERE ll.login_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(ll.login_date)
      ORDER BY DATE(ll.login_date) ASC
    `;
    const [rows] = await pool.query(query);
    return rows || [];
  } catch (error) {
    console.error('Report Service - getLoginActivity error:', error);
    throw error;
  }
};

/**
 * Get enrollment timeline - weekly enrollments over the past 6 months
 * @returns {Promise<Array>} Array of { week, enrollments, completions }
 */
const getEnrollmentTimeline = async () => {
  try {
    const query = `
      SELECT
        DATE_FORMAT(dates.week_start, '%b %d') as week,
        COALESCE(enr.enrollments, 0) as enrollments,
        COALESCE(comp.completions, 0) as completions
      FROM (
        SELECT DATE_SUB(CURDATE(), INTERVAL (n * 7) DAY) as week_start
        FROM (
          SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
          UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
          UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
          UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
          UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
          UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23
        ) numbers
      ) dates
      LEFT JOIN (
        SELECT
          DATE_SUB(DATE(enrolled_date), INTERVAL WEEKDAY(enrolled_date) DAY) as week_start,
          COUNT(*) as enrollments
        FROM enrol
        WHERE enrolled_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY week_start
      ) enr ON DATE(dates.week_start) = DATE(enr.week_start)
      LEFT JOIN (
        SELECT
          DATE_SUB(DATE(lp.completed_at), INTERVAL WEEKDAY(lp.completed_at) DAY) as week_start,
          COUNT(DISTINCT CONCAT(lp.user_id, '-', lp.course_id)) as completions
        FROM lesson_progress lp
        WHERE lp.status = 'completed'
          AND lp.completed_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY week_start
      ) comp ON DATE(dates.week_start) = DATE(comp.week_start)
      WHERE dates.week_start >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      ORDER BY dates.week_start ASC
    `;
    const [rows] = await pool.query(query);
    return rows || [];
  } catch (error) {
    console.error('Report Service - getEnrollmentTimeline error:', error);
    throw error;
  }
};

/**
 * Get course category breakdown - enrollment counts by category
 * @returns {Promise<Array>} Array of { category, courseCount, enrollments, completionRate, color }
 */
const getCategoryBreakdown = async () => {
  try {
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const query = `
      SELECT
        COALESCE(cc.name, 'Uncategorized') as category,
        COUNT(DISTINCT c.id) as courseCount,
        COALESCE(enr.total_enrollments, 0) as enrollments,
        CASE
          WHEN COALESCE(enr.total_enrollments, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(comp.completed, 0) * 100.0 / enr.total_enrollments, 0)
        END as completionRate
      FROM course c
      LEFT JOIN course_category cc ON c.category_id = cc.id
      LEFT JOIN (
        SELECT course_id, COUNT(*) as total_enrollments
        FROM enrol
        GROUP BY course_id
      ) enr ON c.id = enr.course_id
      LEFT JOIN (
        SELECT e.course_id, COUNT(*) as completed
        FROM enrol e
        INNER JOIN lesson_progress lp ON e.user_id = lp.user_id AND e.course_id = lp.course_id
        WHERE lp.status = 'completed'
        GROUP BY e.course_id
      ) comp ON c.id = comp.course_id
      WHERE c.is_deleted = 0
      GROUP BY COALESCE(cc.name, 'Uncategorized')
      ORDER BY enrollments DESC
      LIMIT 8
    `;
    const [rows] = await pool.query(query);
    return (rows || []).map((row, i) => ({
      ...row,
      color: colors[i % colors.length]
    }));
  } catch (error) {
    console.error('Report Service - getCategoryBreakdown error:', error);
    throw error;
  }
};

/**
 * Get course progress distribution - how far learners are in their courses
 * @returns {Promise<Object>} { notStarted, beginner, intermediate, advanced, completed }
 */
const getProgressDistribution = async () => {
  try {
    const query = `
      SELECT
        SUM(CASE WHEN progress_pct = 0 THEN 1 ELSE 0 END) as notStarted,
        SUM(CASE WHEN progress_pct > 0 AND progress_pct <= 25 THEN 1 ELSE 0 END) as beginner,
        SUM(CASE WHEN progress_pct > 25 AND progress_pct <= 50 THEN 1 ELSE 0 END) as intermediate,
        SUM(CASE WHEN progress_pct > 50 AND progress_pct < 100 THEN 1 ELSE 0 END) as advanced,
        SUM(CASE WHEN progress_pct >= 100 THEN 1 ELSE 0 END) as completed
      FROM (
        SELECT
          e.user_id,
          e.course_id,
          CASE
            WHEN total_lessons.cnt = 0 THEN 0
            ELSE ROUND(COALESCE(done_lessons.cnt, 0) * 100.0 / total_lessons.cnt, 0)
          END as progress_pct
        FROM enrol e
        LEFT JOIN (
          SELECT cl.course_id, COUNT(*) as cnt
          FROM course_lesson cl
          INNER JOIN course_section cs ON cl.section_id = cs.id
          WHERE cl.is_deleted = 0
          GROUP BY cl.course_id
        ) total_lessons ON e.course_id = total_lessons.course_id
        LEFT JOIN (
          SELECT lp.user_id, lp.course_id, COUNT(*) as cnt
          FROM lesson_progress lp
          WHERE lp.status = 'completed'
          GROUP BY lp.user_id, lp.course_id
        ) done_lessons ON e.user_id = done_lessons.user_id AND e.course_id = done_lessons.course_id
      ) progress_data
    `;
    const [rows] = await pool.query(query);
    return rows[0] || { notStarted: 0, beginner: 0, intermediate: 0, advanced: 0, completed: 0 };
  } catch (error) {
    console.error('Report Service - getProgressDistribution error:', error);
    throw error;
  }
};

/**
 * Get user growth trend - new registrations per month over last 12 months
 * @returns {Promise<Array>} Array of { month, newUsers, totalUsers }
 */
const getUserGrowth = async () => {
  try {
    const query = `
      SELECT
        DATE_FORMAT(months.month_start, '%b %Y') as month,
        COALESCE(new_users.count, 0) as newUsers,
        (
          SELECT COUNT(*) FROM users
          WHERE is_deleted = 0 AND created_at <= LAST_DAY(months.month_start)
        ) as totalUsers
      FROM (
        SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m-01') as month_start
        FROM (
          SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
          UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
          UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
        ) numbers
      ) months
      LEFT JOIN (
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-01') as month_start,
          COUNT(*) as count
        FROM users
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
      ) new_users ON months.month_start = new_users.month_start
      ORDER BY months.month_start ASC
    `;
    const [rows] = await pool.query(query);
    return rows || [];
  } catch (error) {
    console.error('Report Service - getUserGrowth error:', error);
    throw error;
  }
};

/**
 * Get role distribution - count of users per role
 * @returns {Promise<Array>} Array of { role, count, color }
 */
const getRoleDistribution = async () => {
  try {
    const roleColors = { 'Student': '#3b82f6', 'Instructor': '#10b981', 'Admin': '#f59e0b', 'Super Admin': '#8b5cf6' };
    const roleNames = { 1: 'Student', 2: 'Instructor', 3: 'Admin', 4: 'Super Admin' };
    const query = `
      SELECT
        u.role_id,
        COUNT(*) as count
      FROM users u
      WHERE u.is_deleted = 0
      GROUP BY u.role_id
      ORDER BY u.role_id ASC
    `;
    const [rows] = await pool.query(query);
    return (rows || []).map(row => {
      const roleName = roleNames[row.role_id] || `Role ${row.role_id}`;
      return {
        role: roleName,
        count: row.count,
        color: roleColors[roleName] || '#6b7280'
      };
    });
  } catch (error) {
    console.error('Report Service - getRoleDistribution error:', error);
    throw error;
  }
};

/**
 * Get activity heatmap - user activity by day of week and hour
 * @returns {Promise<Array>} Array of { day, hour, count }
 */
const getActivityHeatmap = async () => {
  try {
    const query = `
      SELECT
        DAYOFWEEK(ll.login_date) as dayNum,
        CASE DAYOFWEEK(ll.login_date)
          WHEN 1 THEN 'Sun' WHEN 2 THEN 'Mon' WHEN 3 THEN 'Tue'
          WHEN 4 THEN 'Wed' WHEN 5 THEN 'Thu' WHEN 6 THEN 'Fri' WHEN 7 THEN 'Sat'
        END as day,
        HOUR(ll.login_date) as hour,
        COUNT(*) as count
      FROM user_login_log ll
      WHERE ll.login_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DAYOFWEEK(ll.login_date), HOUR(ll.login_date)
      ORDER BY dayNum, hour
    `;
    const [rows] = await pool.query(query);
    return rows || [];
  } catch (error) {
    console.error('Report Service - getActivityHeatmap error:', error);
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
  getDashboardAnalytics,
  getLoginActivity,
  getEnrollmentTimeline,
  getCategoryBreakdown,
  getProgressDistribution,
  getUserGrowth,
  getRoleDistribution,
  getActivityHeatmap
};
