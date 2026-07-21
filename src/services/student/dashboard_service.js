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
         WHERE e.user_id = ? AND c.is_deleted = 0 AND c.status IN ('active', 'published')`,
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
           AND c.status IN ('active', 'published')
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

      // Calculate learning streak and total login days (same value, never breaks)
      const [loginDaysResult] = await promisePool.query(
        `SELECT COUNT(DISTINCT DATE(login_time)) as total_login_days
         FROM user_login_log
         WHERE user_uuid = ?
           AND login_time IS NOT NULL`,
        [studentId]
      );
      const totalLoginDays = loginDaysResult[0].total_login_days || 0;
      const learningStreak = totalLoginDays; // Streak = total unique login days
      const currentLoginDays = totalLoginDays;

      // Calculate dynamic goal: starts at 20, then increases by 20 (20, 40, 60, 80, etc.)
      // When user reaches current goal, the max moves to the next 20-day milestone
      const goalDays = Math.max(20, Math.ceil(currentLoginDays / 20) * 20);

      // Calculate percentage for the current segment
      const goalPercentage = Math.min(100, Math.round((currentLoginDays / goalDays) * 100));

      // Return stats object
      const stats = {
        total_courses: totalCourses,
        completed_courses: completedCourses,
        courses_to_milestone: coursesToMilestone,
        total_certificates: totalCertificates,
        learning_streak: learningStreak,                    // Consecutive login days
        current_monthly_hours: currentLoginDays,            // Total login days (renamed for compatibility)
        monthly_goal_hours: goalDays,                       // Dynamic goal (20, 40, 60, etc.)
        monthly_goal_percentage: goalPercentage             // Percentage of current goal segment
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
