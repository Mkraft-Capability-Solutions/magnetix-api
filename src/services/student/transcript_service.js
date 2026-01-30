const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class TranscriptService {
  /**
   * Get transcript statistics for student
   */
  async getTranscriptStats(userId) {
    try {
      const [result] = await promisePool.query('CALL get_student_transcript_stats(?)', [userId]);
      const stats = result[0];

      return new ServiceResponseDTO(true, stats, 'Transcript stats retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve transcript stats',
        code: 'TRANSCRIPT_STATS_ERROR'
      });
    }
  }

  /**
   * Get transcript courses for student (reuses subscribed courses)
   */
  async getTranscriptCourses(userId) {
    try {
      // Direct SQL query to get enrolled courses - same as dashboard My Courses
      const query = `
        SELECT
          c.id,
          c.title,
          c.short_description as shortDescription,
          c.thumbnail,
          c.level,
          c.course_duration as duration,
          cat.name as category,
          e.enrolled_date as enrolledAt,
          (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id) as totalLessons,
          (SELECT COUNT(*) FROM lesson_progress WHERE course_id = c.id AND user_id = ? AND completed = 1) as completedLessons
        FROM enrol e
        INNER JOIN course c ON e.course_id = c.id
        LEFT JOIN course_category cat ON c.category_id = cat.id
        WHERE e.user_id = ? AND c.is_deleted = 0 AND c.status = 'active'
        ORDER BY e.enrolled_date DESC
      `;

      const [courses] = await promisePool.query(query, [userId, userId]);

      return new ServiceResponseDTO(true, courses, 'Transcript courses retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve transcript courses',
        code: 'TRANSCRIPT_COURSES_ERROR'
      });
    }
  }

  /**
   * Get analytics statistics for student
   */
  async getAnalyticsStatistics(userId) {
    try {
      const [result] = await promisePool.query('CALL get_student_analytics_statistics(?)', [userId]);

      // First result set contains month summary
      const summary = result[0][0];

      // Second result set contains weekly data
      const weeklyData = result[1];

      const analyticsData = {
        month: summary.month,
        totalHours: summary.totalHours,
        progressPercentage: summary.progressPercentage,
        weeklyData: weeklyData.map((week, index) => ({
          week_number: week.week_number,
          date: week.date,
          hours: week.hours,
          // Generate SVG coordinates (simplified - frontend can adjust)
          x: 50 + (index * 100),
          y: 200 - (week.hours * 2)
        }))
      };

      return new ServiceResponseDTO(true, analyticsData, 'Analytics statistics retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve analytics statistics',
        code: 'ANALYTICS_STATS_ERROR'
      });
    }
  }

  /**
   * Get monthly comparison for student
   */
  async getMonthlyComparison(userId) {
    try {
      const [result] = await promisePool.query('CALL get_student_monthly_comparison(?)', [userId]);
      const comparison = result[0][0];

      const comparisonData = {
        currentMonth: {
          month: comparison.currentMonth,
          hours: comparison.currentMonthHours
        },
        lastMonth: {
          month: comparison.lastMonth,
          hours: comparison.lastMonthHours
        },
        percentageChange: comparison.percentageChange,
        totalCombined: comparison.totalCombined
      };

      return new ServiceResponseDTO(true, comparisonData, 'Monthly comparison retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve monthly comparison',
        code: 'MONTHLY_COMPARISON_ERROR'
      });
    }
  }
}

module.exports = new TranscriptService();
