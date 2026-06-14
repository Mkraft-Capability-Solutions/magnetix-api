const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class TranscriptService {
  /**
   * Get transcript statistics for student
   */
  async getTranscriptStats(userId) {
    try {
      // 1. Calculate total learning hours (all time)
      const [totalHoursResult] = await promisePool.query(`
        SELECT COALESCE(
          SUM(TIMESTAMPDIFF(SECOND, start_date, COALESCE(end_date, NOW()))) / 3600.0,
          0
        ) AS total_hours
        FROM student_session
        WHERE user_id = ?
      `, [userId]);
      const totalHours = totalHoursResult[0].total_hours;

      // 2. Calculate last month's hours for comparison
      const [lastMonthHoursResult] = await promisePool.query(`
        SELECT COALESCE(
          SUM(TIMESTAMPDIFF(SECOND, start_date, end_date)) / 3600.0,
          0
        ) AS last_month_hours
        FROM student_session
        WHERE user_id = ?
          AND MONTH(start_date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
          AND YEAR(start_date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
          AND end_date IS NOT NULL
      `, [userId]);
      const lastMonthHours = lastMonthHoursResult[0].last_month_hours;

      // 3. Calculate percentage change for hours
      let hoursChange = 0;
      if (lastMonthHours === 0 && totalHours > 0) {
        hoursChange = 100.0;
      } else if (lastMonthHours > 0) {
        hoursChange = Math.round(((totalHours - lastMonthHours) / lastMonthHours) * 100 * 10) / 10;
      }

      // 4. Count completed courses
      const [completedCoursesResult] = await promisePool.query(`
        SELECT COUNT(DISTINCT e.course_id) AS completed_courses
        FROM enrol e
        JOIN course c ON e.course_id = c.id
        WHERE e.user_id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM course_progress cp
            WHERE cp.enroll_id = e.id
              AND (cp.lesson_completed IS NULL OR cp.lesson_completed = 0)
          )
          AND EXISTS (
            SELECT 1
            FROM course_progress cp
            WHERE cp.enroll_id = e.id
          )
      `, [userId]);
      const completedCourses = completedCoursesResult[0].completed_courses;

      // 5. Count skills in progress from AI learning path
      const [skillsGainedResult] = await promisePool.query(`
        SELECT COUNT(*) AS skills_gained
        FROM ai_learning_path_skills
        WHERE user_id = ?
          AND mastery_percentage < 100
      `, [userId]);
      const skillsGained = skillsGainedResult[0].skills_gained;

      // 6. Count total achievements
      const [totalAchievementsResult] = await promisePool.query(`
        SELECT COUNT(*) AS total_achievements
        FROM user_achievements
        WHERE user_id = ?
          AND is_unlocked = 1
      `, [userId]);
      const totalAchievements = totalAchievementsResult[0].total_achievements;

      // 7. Format response to match stored procedure output
      const stats = [
        {
          id: 1,
          label: 'Course Completed',
          value: String(completedCourses),
          change: `+${completedCourses}`
        },
        {
          id: 2,
          label: 'Learning Hours',
          value: String(Math.round(totalHours * 10) / 10),
          change: `${hoursChange >= 0 ? '+' : ''}${hoursChange}%`
        },
        {
          id: 3,
          label: 'Skills Gained',
          value: String(skillsGained),
          change: `+${skillsGained}`
        },
        {
          id: 4,
          label: 'Total Achievements',
          value: String(totalAchievements),
          change: `+${totalAchievements}`
        }
      ];

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
