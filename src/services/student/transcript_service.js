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
   * Get transcript courses for student (reuses subscribed courses logic)
   */
  async getTranscriptCourses(userId) {
    try {
      // Direct SQL query to get enrolled courses - same logic as My Courses
      const query = `
        SELECT
          c.id,
          c.title,
          c.short_description,
          c.thumbnail,
          c.level,
          c.category_id,
          COALESCE(cat.category_name, '') as category_name,
          e.enrolled_date,
          (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id) as total_lessons,
          (SELECT COUNT(*) FROM course_progress cp WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1) as completedLessons
        FROM enrol e
        INNER JOIN course c ON e.course_id = c.id
        LEFT JOIN category cat ON c.category_id = cat.id
        WHERE e.user_id = ? AND c.is_deleted = 0 AND c.status = 'active'
        ORDER BY e.enrolled_date DESC
      `;

      const [courses] = await promisePool.query(query, [userId]);

      // For each course, calculate total duration from lessons
      const coursesWithDuration = await Promise.all(courses.map(async (course) => {
        const [lessons] = await promisePool.query(
          'SELECT lesson_duration FROM course_lesson WHERE course_id = ?',
          [course.id]
        );

        // Parse and sum lesson durations
        let totalMinutes = 0;
        lessons.forEach(lesson => {
          if (lesson.lesson_duration) {
            const duration = lesson.lesson_duration.toLowerCase();

            // Extract hours
            const hoursMatch = duration.match(/(\d+)\s*(hour|hr)/);
            if (hoursMatch) {
              totalMinutes += parseInt(hoursMatch[1]) * 60;
            }

            // Extract minutes
            const minsMatch = duration.match(/(\d+)\s*(minute|min)/);
            if (minsMatch) {
              totalMinutes += parseInt(minsMatch[1]);
            }

            // If no hours or minutes found, try just a number
            if (!hoursMatch && !minsMatch) {
              const numMatch = duration.match(/(\d+)/);
              if (numMatch) {
                totalMinutes += parseInt(numMatch[1]);
              }
            }
          }
        });

        // Format duration string
        let course_duration;
        if (totalMinutes === 0) {
          course_duration = '0 mins';
        } else if (totalMinutes < 60) {
          course_duration = `${totalMinutes} mins`;
        } else {
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          if (mins === 0) {
            course_duration = hours === 1 ? `${hours} hr` : `${hours} hrs`;
          } else {
            course_duration = `${hours} hr ${mins} mins`;
          }
        }

        return {
          ...course,
          course_duration
        };
      }));

      return new ServiceResponseDTO(true, coursesWithDuration, 'Transcript courses retrieved successfully');
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
