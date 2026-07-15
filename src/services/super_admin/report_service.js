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
    // NOTE: the legacy sp_get_course_completion_report computed
    //   completedCount = COUNT(... WHEN e.last_updated IS NOT NULL ...)
    // which counts EVERY enrolment as "completed" (last_updated is virtually
    // never null) — reporting ~100% for every course. This inline query uses
    // the real definition (all course lessons completed), consistent with the
    // KPI band / enrolment funnel, so the dashboard and export agree.
    const [rows] = await pool.query(
      `SELECT
         c.id AS courseId,
         c.title AS courseTitle,
         COALESCE(cat.category_name, 'Uncategorized') AS category,
         COUNT(DISTINCT e.id) AS totalEnrollments,
         COUNT(DISTINCT CASE WHEN tl.lc > 0 AND cd.cc >= tl.lc THEN e.id END) AS completedCount,
         ROUND(
           COUNT(DISTINCT CASE WHEN tl.lc > 0 AND cd.cc >= tl.lc THEN e.id END) * 100.0
           / NULLIF(COUNT(DISTINCT e.id), 0), 1
         ) AS completionRate,
         ROUND(COALESCE(SUM(cd.total_time), 0) / NULLIF(COUNT(DISTINCT e.id), 0), 0) AS avgTimeSpentMinutes,
         c.course_duration AS courseDuration
       FROM course c
       LEFT JOIN enrol e ON c.id = e.course_id
         AND (? IS NULL OR e.enrolled_date >= ?)
         AND (? IS NULL OR e.enrolled_date <= ?)
       LEFT JOIN category cat ON c.category_id = cat.id
       LEFT JOIN (
         SELECT cl.course_id, COUNT(*) AS lc
         FROM course_lesson cl WHERE cl.is_deleted = 0 GROUP BY cl.course_id
       ) tl ON tl.course_id = c.id
       LEFT JOIN (
         SELECT cp.enroll_id,
                COUNT(CASE WHEN cp.lesson_completed = 1 THEN 1 END) AS cc,
                SUM(cp.time_spent) AS total_time
         FROM course_progress cp GROUP BY cp.enroll_id
       ) cd ON cd.enroll_id = e.id
       WHERE c.is_deleted = 0
       GROUP BY c.id, c.title, cat.category_name, c.course_duration
       ORDER BY completionRate DESC, totalEnrollments DESC`,
      [fromDate, fromDate, toDate, toDate]
    );
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

// ===========================================================================
// EXTENDED ANALYTICS (inline SQL — no stored procedures, so no deploy drift).
// The canonical "completed enrollment" definition mirrors the existing SPs:
// an enrollment is complete when the course has lessons AND the number of
// completed lessons for that enrollment >= the course's lesson count.
// ===========================================================================

// Reusable FROM/JOIN block that decorates each enrolment row with the course's
// total lesson count (tl.lc) and this enrolment's completed lesson count (cd.cc).
const ENROL_COMPLETION_JOINS = `
  FROM enrol e
  JOIN course c ON c.id = e.course_id AND c.is_deleted = 0
  LEFT JOIN (
    SELECT cl.course_id, COUNT(*) AS lc
    FROM course_lesson cl WHERE cl.is_deleted = 0 GROUP BY cl.course_id
  ) tl ON tl.course_id = c.id
  LEFT JOIN (
    SELECT cp.enroll_id, COUNT(*) AS cc
    FROM course_progress cp WHERE cp.lesson_completed = 1 GROUP BY cp.enroll_id
  ) cd ON cd.enroll_id = e.id
`;
const IS_COMPLETED = `(tl.lc > 0 AND cd.cc >= tl.lc)`;
const IS_STARTED = `(COALESCE(cd.cc, 0) > 0)`;

/**
 * KPI summary band — headline numbers plus period-over-period deltas.
 * @returns {Promise<Object>}
 */
const getKpiSummary = async () => {
  const [[learners]] = await pool.query(`
    SELECT
      COUNT(*) AS totalLearners,
      SUM(CASE WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS newThisMonth,
      SUM(CASE WHEN created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
                AND created_at <  DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS newLastMonth
    FROM users WHERE role_id = 1 AND is_deleted = 0
  `);

  const [[active]] = await pool.query(`
    SELECT
      COUNT(DISTINCT CASE WHEN login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN user_uuid END) AS activeThisWeek,
      COUNT(DISTINCT CASE WHEN login_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                           AND login_time <  DATE_SUB(NOW(), INTERVAL 7 DAY) THEN user_uuid END) AS activePrevWeek
    FROM user_login_log
  `);

  const [[enrolAgg]] = await pool.query(`
    SELECT
      COUNT(*) AS totalEnrollments,
      SUM(CASE WHEN ${IS_COMPLETED} THEN 1 ELSE 0 END) AS completedEnrollments
    ${ENROL_COMPLETION_JOINS}
  `);

  const [[certs]] = await pool.query(`
    SELECT
      COUNT(*) AS certificatesIssued,
      SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date >= CURDATE()
                AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS expiringSoon,
      SUM(CASE WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS issuedThisMonth
    FROM student_certificates
  `);

  const [[assess]] = await pool.query(`
    SELECT ROUND(AVG(percentage), 1) AS avgScore, COUNT(*) AS responses
    FROM feedback_responses WHERE percentage IS NOT NULL
  `);

  const [[time]] = await pool.query(`
    SELECT
      COALESCE(SUM(cp.time_spent), 0) AS totalMinutes,
      COUNT(DISTINCT e.user_id) AS learnersWithTime
    FROM course_progress cp JOIN enrol e ON e.id = cp.enroll_id
  `);

  const totalEnrollments = Number(enrolAgg.totalEnrollments) || 0;
  const completedEnrollments = Number(enrolAgg.completedEnrollments) || 0;
  const learnersWithTime = Number(time.learnersWithTime) || 0;

  return {
    totalLearners: Number(learners.totalLearners) || 0,
    newLearnersThisMonth: Number(learners.newThisMonth) || 0,
    newLearnersLastMonth: Number(learners.newLastMonth) || 0,
    activeThisWeek: Number(active.activeThisWeek) || 0,
    activePrevWeek: Number(active.activePrevWeek) || 0,
    totalEnrollments,
    completedEnrollments,
    completionRate: totalEnrollments ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
    certificatesIssued: Number(certs.certificatesIssued) || 0,
    certsExpiringSoon: Number(certs.expiringSoon) || 0,
    certsIssuedThisMonth: Number(certs.issuedThisMonth) || 0,
    avgAssessmentScore: Number(assess.avgScore) || 0,
    assessmentResponses: Number(assess.responses) || 0,
    avgTimePerLearnerMinutes: learnersWithTime ? Math.round(Number(time.totalMinutes) / learnersWithTime) : 0,
  };
};

/**
 * Distinct department names actually present in the data (for filter dropdowns).
 * @returns {Promise<string[]>}
 */
const getDepartments = async () => {
  const [rows] = await pool.query(`
    SELECT DISTINCT department
    FROM student_corporate_info
    WHERE department IS NOT NULL AND TRIM(department) <> ''
    ORDER BY department
  `);
  return rows.map((r) => r.department);
};

/**
 * Enrollment → engagement → completion → certification funnel.
 * @returns {Promise<Object>}
 */
const getEnrollmentFunnel = async () => {
  const [[row]] = await pool.query(`
    SELECT
      COUNT(*) AS enrolled,
      SUM(CASE WHEN ${IS_STARTED} THEN 1 ELSE 0 END) AS started,
      SUM(CASE WHEN ${IS_COMPLETED} THEN 1 ELSE 0 END) AS completed
    ${ENROL_COMPLETION_JOINS}
  `);
  const [[cert]] = await pool.query(`
    SELECT COUNT(DISTINCT user_id) AS certified FROM student_certificates
  `);
  return {
    enrolled: Number(row.enrolled) || 0,
    started: Number(row.started) || 0,
    completed: Number(row.completed) || 0,
    certified: Number(cert.certified) || 0,
  };
};

/**
 * Histogram of total time-spent per learner (minutes), plus average.
 * @returns {Promise<Object>}
 */
const getTimeDistribution = async () => {
  const [rows] = await pool.query(`
    SELECT bucket, COUNT(*) AS learners FROM (
      SELECT e.user_id,
        CASE
          WHEN SUM(cp.time_spent) IS NULL OR SUM(cp.time_spent) = 0 THEN '0'
          WHEN SUM(cp.time_spent) <= 30  THEN '1-30'
          WHEN SUM(cp.time_spent) <= 60  THEN '31-60'
          WHEN SUM(cp.time_spent) <= 120 THEN '61-120'
          WHEN SUM(cp.time_spent) <= 240 THEN '121-240'
          ELSE '240+'
        END AS bucket
      FROM enrol e
      LEFT JOIN course_progress cp ON cp.enroll_id = e.id
      GROUP BY e.user_id
    ) t GROUP BY bucket
  `);
  const [[avg]] = await pool.query(`
    SELECT ROUND(AVG(mins), 0) AS avgMinutes FROM (
      SELECT COALESCE(SUM(cp.time_spent), 0) AS mins
      FROM enrol e LEFT JOIN course_progress cp ON cp.enroll_id = e.id
      GROUP BY e.user_id
    ) x
  `);
  const ORDER = ['0', '1-30', '31-60', '61-120', '121-240', '240+'];
  const map = new Map(rows.map((r) => [r.bucket, Number(r.learners)]));
  return {
    buckets: ORDER.map((label) => ({ label, learners: map.get(label) || 0 })),
    avgMinutes: Number(avg.avgMinutes) || 0,
  };
};

/**
 * Login activity heatmap — counts by day-of-week (1=Sun..7=Sat) × hour, last 90 days.
 * @returns {Promise<Array>}
 */
const getActivityHeatmap = async () => {
  const [rows] = await pool.query(`
    SELECT DAYOFWEEK(login_time) AS dow, HOUR(login_time) AS hour, COUNT(*) AS count
    FROM user_login_log
    WHERE login_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY dow, hour
  `);
  return rows.map((r) => ({ dow: Number(r.dow), hour: Number(r.hour), count: Number(r.count) }));
};

/**
 * Gamification: learner level distribution + top streaks.
 * @returns {Promise<Object>}
 */
const getLevelDistribution = async () => {
  const [levels] = await pool.query(`
    SELECT current_level AS level, COUNT(*) AS learners
    FROM user_points GROUP BY current_level ORDER BY current_level
  `);
  const [streaks] = await pool.query(`
    SELECT
      TRIM(CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, ''))) AS name,
      up.current_streak AS currentStreak, up.longest_streak AS longestStreak, up.total_points AS points
    FROM user_points up
    LEFT JOIN students s ON s.user_id = up.user_id
    WHERE up.longest_streak > 0
    ORDER BY up.longest_streak DESC, up.current_streak DESC
    LIMIT 10
  `);
  return {
    levels: levels.map((l) => ({ level: Number(l.level), learners: Number(l.learners) })),
    topStreaks: streaks.map((s) => ({
      name: s.name && s.name.trim() ? s.name.trim() : 'Learner',
      currentStreak: Number(s.currentStreak) || 0,
      longestStreak: Number(s.longestStreak) || 0,
      points: Number(s.points) || 0,
    })),
  };
};

/**
 * Certification expiry risk buckets + upcoming expirations list.
 * @returns {Promise<Object>}
 */
const getCertificationExpiry = async () => {
  const [[buckets]] = await pool.query(`
    SELECT
      SUM(CASE WHEN expiry_date IS NULL OR expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS valid,
      SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date >= CURDATE()
                AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS expiringSoon,
      SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired
    FROM student_certificates
  `);
  const [upcoming] = await pool.query(`
    SELECT sc.certificate_name AS name,
      TRIM(CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, ''))) AS learner,
      sc.expiry_date AS expiryDate, DATEDIFF(sc.expiry_date, CURDATE()) AS daysLeft
    FROM student_certificates sc
    LEFT JOIN students s ON s.user_id = sc.user_id
    WHERE sc.expiry_date IS NOT NULL AND sc.expiry_date >= CURDATE()
      AND sc.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)
    ORDER BY sc.expiry_date ASC LIMIT 10
  `);
  return {
    valid: Number(buckets.valid) || 0,
    expiringSoon: Number(buckets.expiringSoon) || 0,
    expired: Number(buckets.expired) || 0,
    upcoming: upcoming.map((u) => ({
      name: u.name || 'Certificate',
      learner: u.learner && u.learner.trim() ? u.learner.trim() : '—',
      expiryDate: u.expiryDate,
      daysLeft: Number(u.daysLeft),
    })),
  };
};

/**
 * Assessment score distribution + pass rate (pass = percentage >= form passing_score or 60).
 * @returns {Promise<Object>}
 */
const getAssessmentScores = async () => {
  const [rows] = await pool.query(`
    SELECT bucket, COUNT(*) AS responses FROM (
      SELECT
        CASE
          WHEN percentage < 20 THEN '0-20'
          WHEN percentage < 40 THEN '20-40'
          WHEN percentage < 60 THEN '40-60'
          WHEN percentage < 80 THEN '60-80'
          ELSE '80-100'
        END AS bucket
      FROM feedback_responses WHERE percentage IS NOT NULL
    ) t GROUP BY bucket
  `);
  const [[stats]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      ROUND(AVG(fr.percentage), 1) AS avgScore,
      SUM(CASE WHEN fr.percentage >= COALESCE(ff.passing_score, 60) THEN 1 ELSE 0 END) AS passed
    FROM feedback_responses fr
    LEFT JOIN feedback_forms ff ON ff.id = fr.form_id
    WHERE fr.percentage IS NOT NULL
  `);
  const ORDER = ['0-20', '20-40', '40-60', '60-80', '80-100'];
  const map = new Map(rows.map((r) => [r.bucket, Number(r.responses)]));
  const total = Number(stats.total) || 0;
  return {
    buckets: ORDER.map((label) => ({ label, responses: map.get(label) || 0 })),
    total,
    avgScore: Number(stats.avgScore) || 0,
    passRate: total ? Math.round((Number(stats.passed) / total) * 100) : 0,
  };
};

/**
 * Cohort matrix: signup-month cohorts × [enrolled %, completed %, active-30d %].
 * @returns {Promise<Array>}
 */
const getCohortRetention = async () => {
  const [rows] = await pool.query(`
    SELECT
      DATE_FORMAT(u.created_at, '%Y-%m') AS cohort,
      COUNT(DISTINCT u.uuid) AS size,
      COUNT(DISTINCT e.user_id) AS enrolledUsers,
      COUNT(DISTINCT comp.user_id) AS completedUsers,
      COUNT(DISTINCT act.user_uuid) AS activeUsers
    FROM users u
    LEFT JOIN enrol e ON e.user_id = u.uuid
    LEFT JOIN (
      SELECT DISTINCT e2.user_id
      FROM enrol e2
      JOIN course c2 ON c2.id = e2.course_id AND c2.is_deleted = 0
      LEFT JOIN (
        SELECT cl.course_id, COUNT(*) AS lc FROM course_lesson cl WHERE cl.is_deleted = 0 GROUP BY cl.course_id
      ) tl2 ON tl2.course_id = c2.id
      LEFT JOIN (
        SELECT cp.enroll_id, COUNT(*) AS cc FROM course_progress cp WHERE cp.lesson_completed = 1 GROUP BY cp.enroll_id
      ) cd2 ON cd2.enroll_id = e2.id
      WHERE tl2.lc > 0 AND cd2.cc >= tl2.lc
    ) comp ON comp.user_id = u.uuid
    LEFT JOIN (
      SELECT DISTINCT user_uuid FROM user_login_log WHERE login_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ) act ON act.user_uuid = u.uuid
    WHERE u.role_id = 1 AND u.is_deleted = 0
      AND u.created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
    GROUP BY DATE_FORMAT(u.created_at, '%Y-%m')
    ORDER BY cohort
  `);
  return rows.map((r) => {
    const size = Number(r.size) || 0;
    const pct = (n) => (size ? Math.round((Number(n) / size) * 100) : 0);
    return {
      cohort: r.cohort,
      size,
      enrolledPct: pct(r.enrolledUsers),
      completedPct: pct(r.completedUsers),
      activePct: pct(r.activeUsers),
    };
  });
};

/**
 * Per-team performance vs org: members, completion rate, active this week, avg points.
 * @returns {Promise<Array>}
 */
const getTeamPerformance = async () => {
  const [rows] = await pool.query(`
    SELECT
      t.id, t.name AS team,
      COUNT(DISTINCT tm.user_id) AS members,
      COUNT(DISTINCT e.id) AS enrollments,
      SUM(CASE WHEN ${IS_COMPLETED} THEN 1 ELSE 0 END) AS completed,
      COUNT(DISTINCT act.user_uuid) AS activeThisWeek,
      ROUND(AVG(up.total_points), 0) AS avgPoints
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN enrol e ON e.user_id = tm.user_id
    LEFT JOIN course c ON c.id = e.course_id AND c.is_deleted = 0
    LEFT JOIN (
      SELECT cl.course_id, COUNT(*) AS lc FROM course_lesson cl WHERE cl.is_deleted = 0 GROUP BY cl.course_id
    ) tl ON tl.course_id = c.id
    LEFT JOIN (
      SELECT cp.enroll_id, COUNT(*) AS cc FROM course_progress cp WHERE cp.lesson_completed = 1 GROUP BY cp.enroll_id
    ) cd ON cd.enroll_id = e.id
    LEFT JOIN (
      SELECT DISTINCT user_uuid FROM user_login_log WHERE login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ) act ON act.user_uuid = tm.user_id
    LEFT JOIN user_points up ON up.user_id = tm.user_id
    WHERE t.is_deleted = 0
    GROUP BY t.id, t.name
    ORDER BY members DESC
    LIMIT 20
  `);
  return rows.map((r) => {
    const enrollments = Number(r.enrollments) || 0;
    const completed = Number(r.completed) || 0;
    return {
      team: r.team,
      members: Number(r.members) || 0,
      completionRate: enrollments ? Math.round((completed / enrollments) * 100) : 0,
      activeThisWeek: Number(r.activeThisWeek) || 0,
      avgPoints: Number(r.avgPoints) || 0,
    };
  });
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
  // extended analytics
  getKpiSummary,
  getDepartments,
  getEnrollmentFunnel,
  getTimeDistribution,
  getActivityHeatmap,
  getLevelDistribution,
  getCertificationExpiry,
  getAssessmentScores,
  getCohortRetention,
  getTeamPerformance,
};
