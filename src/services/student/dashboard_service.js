const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class DashboardService {
  /**
   * Get dashboard statistics for student
   */
  async getDashboardStats(studentId) {
    try {
      // Get total enrolled courses
      const [totalCoursesResult] = await promisePool.query(
        `SELECT COUNT(*) as total_courses
         FROM enrol e
         INNER JOIN course c ON e.course_id = c.id
         WHERE e.user_id = ? AND c.is_deleted = 0 AND c.status = 'active'`,
        [studentId]
      );
      const totalCourses = totalCoursesResult[0].total_courses;

      // Get completed courses (all lessons completed)
      const [completedCoursesResult] = await promisePool.query(
        `SELECT COUNT(*) as completed_courses
         FROM enrol e
         INNER JOIN course c ON e.course_id = c.id
         WHERE e.user_id = ?
           AND c.is_deleted = 0
           AND c.status = 'active'
           AND (
             SELECT COUNT(*)
             FROM course_progress cp
             WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1
           ) = (
             SELECT COUNT(*)
             FROM course_lesson cl
             WHERE cl.course_id = c.id
           )
           AND (
             SELECT COUNT(*)
             FROM course_lesson cl
             WHERE cl.course_id = c.id
           ) > 0`,
        [studentId]
      );
      const completedCourses = completedCoursesResult[0].completed_courses;

      // Calculate courses to milestone (next multiple of 5)
      let coursesToMilestone = 5 - (completedCourses % 5);
      if (coursesToMilestone === 5 && completedCourses > 0) {
        coursesToMilestone = 0;
      }

      // Get certification program completion certificates
      const [certificationCertsResult] = await promisePool.query(
        `SELECT COUNT(*) as count
         FROM student_certification_enrollments
         WHERE user_id = ?
           AND status = 'completed'
           AND certificate_issued_date IS NOT NULL`,
        [studentId]
      );
      const certificationCertificates = certificationCertsResult[0].count;

      // Get admin-issued certificates
      const [adminCertsResult] = await promisePool.query(
        `SELECT COUNT(*) as count
         FROM admin_issued_certificates
         WHERE user_id = ?
           AND status = 'active'
           AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
        [studentId]
      );
      const adminCertificates = adminCertsResult[0].count;

      // Total certificates (certification completions + admin-issued)
      const totalCertificates = certificationCertificates + adminCertificates;

      // Calculate learning streak (count distinct days with lesson completions in last 7 days)
      const [streakResult] = await promisePool.query(
        `SELECT COUNT(DISTINCT DATE(cp.last_access)) as streak_days
         FROM course_progress cp
         INNER JOIN enrol e ON cp.enroll_id = e.id
         WHERE e.user_id = ?
           AND cp.lesson_completed = 1
           AND cp.last_access IS NOT NULL
           AND DATE(cp.last_access) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
        [studentId]
      );
      const learningStreak = streakResult[0].streak_days || 0;

      // Get current month's learning hours (if learner_hours_log table exists)
      let currentMonthlyHours = 0;
      try {
        const [hoursResult] = await promisePool.query(
          `SELECT COALESCE(SUM(hours_spent), 0) as hours
           FROM learner_hours_log
           WHERE user_id = ?
             AND YEAR(log_date) = YEAR(CURDATE())
             AND MONTH(log_date) = MONTH(CURDATE())`,
          [studentId]
        );
        currentMonthlyHours = hoursResult[0].hours;
      } catch (err) {
        // Table might not exist, default to 0
        currentMonthlyHours = 0;
      }

      // Monthly goal settings
      const monthlyGoalHours = 20.0;
      const monthlyGoalPercentage = Math.min(100, Math.round((currentMonthlyHours / monthlyGoalHours) * 100));

      // Return stats object
      const stats = {
        total_courses: totalCourses,
        completed_courses: completedCourses,
        courses_to_milestone: coursesToMilestone,
        total_certificates: totalCertificates,
        learning_streak: learningStreak,
        current_monthly_hours: parseFloat(currentMonthlyHours.toFixed(1)),
        monthly_goal_hours: monthlyGoalHours,
        monthly_goal_percentage: monthlyGoalPercentage
      };

      return new ServiceResponseDTO(true, stats, 'Dashboard stats retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve dashboard stats',
        code: 'DASHBOARD_STATS_ERROR'
      });
    }
  }
}

module.exports = new DashboardService();
