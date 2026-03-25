const { promisePool } = require("../../config/db");

class ReportAnalyticsRepository {
  async callStoredProcedure(procedureName, params = []) {
    const placeholders = params.map(() => "?").join(", ");
    const [rows] = await promisePool.query(
      `CALL ${procedureName}(${placeholders})`,
      params
    );
    return rows[0] || [];
  }

  async executeQuery(query, params = []) {
    const [rows] = await promisePool.query(query, params);
    return rows;
  }

  // ============================================================================
  // STORED PROCEDURE CALLS
  // ============================================================================

  async getLeaderboard(instructorId, limit) {
    return this.callStoredProcedure("sp_get_report_leaderboard", [instructorId, limit]);
  }

  async getDepartmentPerformance(instructorId) {
    return this.callStoredProcedure("sp_get_department_performance", [instructorId]);
  }

  async getCompletionTrends(instructorId) {
    return this.callStoredProcedure("sp_get_completion_trends", [instructorId]);
  }

  async getUserReportData(instructorId, fromDate, toDate, department) {
    return this.callStoredProcedure("sp_get_user_report_data", [
      instructorId, fromDate, toDate, department,
    ]);
  }

  async getLearningEngagementData(instructorId, fromDate, toDate) {
    const rows = await this.callStoredProcedure("sp_get_learning_engagement_report", [
      instructorId, fromDate, toDate,
    ]);
    return rows[0] || null;
  }

  async getSkillsAssessmentData(instructorId) {
    return this.callStoredProcedure("sp_get_skills_assessment", [instructorId]);
  }

  // ============================================================================
  // DIRECT QUERIES
  // ============================================================================

  async getCertificationDistribution() {
    const query = `
      SELECT
        type,
        percentage,
        CASE
          WHEN row_num = 1 THEN '#10b981'
          WHEN row_num = 2 THEN '#3b82f6'
          WHEN row_num = 3 THEN '#a855f7'
          ELSE '#f59e0b'
        END AS color
      FROM (
        SELECT
          COALESCE(sc.certificate_name, 'Other') AS type,
          ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM student_certificates), 0), 0) AS percentage,
          ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS row_num
        FROM student_certificates sc
        GROUP BY COALESCE(sc.certificate_name, 'Other')
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) cert_data
    `;
    return this.executeQuery(query);
  }

  async getCourseCompletionData(fromDate, toDate) {
    let dateFilter = "";
    const params = [];
    if (fromDate) { dateFilter += " AND e.enrolled_date >= ?"; params.push(fromDate); }
    if (toDate) { dateFilter += " AND e.enrolled_date <= ?"; params.push(toDate); }

    const query = `
      SELECT
        c.id AS courseId,
        c.title AS courseTitle,
        COALESCE(cat.category_name, 'Uncategorized') AS category,
        COUNT(DISTINCT e.user_id) AS totalEnrollments,
        COUNT(DISTINCT CASE
          WHEN total_lessons.lesson_count > 0
            AND completed_lessons.completed_count >= total_lessons.lesson_count
          THEN e.user_id
        END) AS completedCount,
        ROUND(
          COUNT(DISTINCT CASE
            WHEN total_lessons.lesson_count > 0
              AND completed_lessons.completed_count >= total_lessons.lesson_count
            THEN e.user_id
          END) * 100.0 /
          NULLIF(COUNT(DISTINCT e.user_id), 0),
          1
        ) AS completionRate,
        COALESCE(ROUND(AVG(cp_time.time_spent), 1), 0) AS avgTimeSpentMinutes,
        c.course_duration AS courseDuration
      FROM course c
      LEFT JOIN enrol e ON c.id = e.course_id
      LEFT JOIN category cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT cl.course_id, COUNT(*) AS lesson_count
        FROM course_lesson cl
        INNER JOIN course_section cs ON cl.section_id = cs.id
        WHERE cl.is_deleted = 0
        GROUP BY cl.course_id
      ) total_lessons ON c.id = total_lessons.course_id
      LEFT JOIN (
        SELECT cp.enroll_id, e2.course_id, COUNT(*) AS completed_count
        FROM course_progress cp
        INNER JOIN enrol e2 ON cp.enroll_id = e2.id
        WHERE cp.lesson_completed = 1
        GROUP BY cp.enroll_id, e2.course_id
      ) completed_lessons ON e.id = completed_lessons.enroll_id AND c.id = completed_lessons.course_id
      LEFT JOIN (
        SELECT enroll_id, COALESCE(SUM(time_spent), 0) AS time_spent
        FROM course_progress
        GROUP BY enroll_id
      ) cp_time ON e.id = cp_time.enroll_id
      WHERE c.is_deleted = 0
        ${dateFilter}
      GROUP BY c.id, c.title, cat.category_name, c.course_duration
      ORDER BY completionRate DESC
    `;
    return this.executeQuery(query, params);
  }

  async getLoginActivity() {
    const query = `
      SELECT
        DATE_FORMAT(ll.login_date, '%Y-%m-%d') AS date,
        COUNT(DISTINCT ll.user_id) AS activeUsers
      FROM user_login_log ll
      WHERE ll.login_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(ll.login_date)
      ORDER BY DATE(ll.login_date) ASC
    `;
    return this.executeQuery(query);
  }

  async getEnrollmentTimeline() {
    const query = `
      SELECT
        DATE_FORMAT(dates.week_start, '%b %d') AS week,
        COALESCE(enr.enrollments, 0) AS enrollments,
        COALESCE(comp.completions, 0) AS completions
      FROM (
        SELECT DATE_SUB(CURDATE(), INTERVAL (n * 7) DAY) AS week_start
        FROM (
          SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
          UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
          UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
          UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
          UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
          UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23
        ) numbers
      ) dates
      LEFT JOIN (
        SELECT
          DATE_SUB(DATE(enrolled_date), INTERVAL WEEKDAY(enrolled_date) DAY) AS week_start,
          COUNT(*) AS enrollments
        FROM enrol
        WHERE enrolled_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY week_start
      ) enr ON DATE(dates.week_start) = DATE(enr.week_start)
      LEFT JOIN (
        SELECT
          DATE_SUB(DATE(lp.completed_at), INTERVAL WEEKDAY(lp.completed_at) DAY) AS week_start,
          COUNT(DISTINCT CONCAT(lp.user_id, '-', lp.course_id)) AS completions
        FROM lesson_progress lp
        WHERE lp.status = 'completed'
          AND lp.completed_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY week_start
      ) comp ON DATE(dates.week_start) = DATE(comp.week_start)
      WHERE dates.week_start >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      ORDER BY dates.week_start ASC
    `;
    return this.executeQuery(query);
  }

  async getCategoryBreakdown() {
    const query = `
      SELECT
        COALESCE(cc.name, 'Uncategorized') AS category,
        COUNT(DISTINCT c.id) AS courseCount,
        COALESCE(enr.total_enrollments, 0) AS enrollments,
        CASE
          WHEN COALESCE(enr.total_enrollments, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(comp.completed, 0) * 100.0 / enr.total_enrollments, 0)
        END AS completionRate
      FROM course c
      LEFT JOIN course_category cc ON c.category_id = cc.id
      LEFT JOIN (
        SELECT course_id, COUNT(*) AS total_enrollments
        FROM enrol
        GROUP BY course_id
      ) enr ON c.id = enr.course_id
      LEFT JOIN (
        SELECT e.course_id, COUNT(*) AS completed
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
    return this.executeQuery(query);
  }

  async getProgressDistribution() {
    const query = `
      SELECT
        SUM(CASE WHEN progress_pct = 0 THEN 1 ELSE 0 END) AS notStarted,
        SUM(CASE WHEN progress_pct > 0 AND progress_pct <= 25 THEN 1 ELSE 0 END) AS beginner,
        SUM(CASE WHEN progress_pct > 25 AND progress_pct <= 50 THEN 1 ELSE 0 END) AS intermediate,
        SUM(CASE WHEN progress_pct > 50 AND progress_pct < 100 THEN 1 ELSE 0 END) AS advanced,
        SUM(CASE WHEN progress_pct >= 100 THEN 1 ELSE 0 END) AS completed
      FROM (
        SELECT
          e.user_id,
          e.course_id,
          CASE
            WHEN total_lessons.cnt = 0 THEN 0
            ELSE ROUND(COALESCE(done_lessons.cnt, 0) * 100.0 / total_lessons.cnt, 0)
          END AS progress_pct
        FROM enrol e
        LEFT JOIN (
          SELECT cl.course_id, COUNT(*) AS cnt
          FROM course_lesson cl
          INNER JOIN course_section cs ON cl.section_id = cs.id
          WHERE cl.is_deleted = 0
          GROUP BY cl.course_id
        ) total_lessons ON e.course_id = total_lessons.course_id
        LEFT JOIN (
          SELECT lp.user_id, lp.course_id, COUNT(*) AS cnt
          FROM lesson_progress lp
          WHERE lp.status = 'completed'
          GROUP BY lp.user_id, lp.course_id
        ) done_lessons ON e.user_id = done_lessons.user_id AND e.course_id = done_lessons.course_id
      ) progress_data
    `;
    const rows = await this.executeQuery(query);
    return rows[0] || { notStarted: 0, beginner: 0, intermediate: 0, advanced: 0, completed: 0 };
  }

  async getUserGrowth() {
    const query = `
      SELECT
        DATE_FORMAT(months.month_start, '%b %Y') AS month,
        COALESCE(new_users.count, 0) AS newUsers,
        (
          SELECT COUNT(*) FROM users
          WHERE is_deleted = 0 AND created_at <= LAST_DAY(months.month_start)
        ) AS totalUsers
      FROM (
        SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m-01') AS month_start
        FROM (
          SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
          UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
          UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
        ) numbers
      ) months
      LEFT JOIN (
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-01') AS month_start,
          COUNT(*) AS count
        FROM users
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
      ) new_users ON months.month_start = new_users.month_start
      ORDER BY months.month_start ASC
    `;
    return this.executeQuery(query);
  }

  async getRoleDistribution() {
    const query = `
      SELECT
        u.role_id,
        COUNT(*) AS count
      FROM users u
      WHERE u.is_deleted = 0
      GROUP BY u.role_id
      ORDER BY u.role_id ASC
    `;
    return this.executeQuery(query);
  }

  async getActivityHeatmap() {
    const query = `
      SELECT
        DAYOFWEEK(ll.login_date) AS dayNum,
        CASE DAYOFWEEK(ll.login_date)
          WHEN 1 THEN 'Sun' WHEN 2 THEN 'Mon' WHEN 3 THEN 'Tue'
          WHEN 4 THEN 'Wed' WHEN 5 THEN 'Thu' WHEN 6 THEN 'Fri' WHEN 7 THEN 'Sat'
        END AS day,
        HOUR(ll.login_date) AS hour,
        COUNT(*) AS count
      FROM user_login_log ll
      WHERE ll.login_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DAYOFWEEK(ll.login_date), HOUR(ll.login_date)
      ORDER BY dayNum, hour
    `;
    return this.executeQuery(query);
  }
}

module.exports = new ReportAnalyticsRepository();
