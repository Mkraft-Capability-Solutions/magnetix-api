const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class AchievementsService {
  /**
   * Award points to a user for an activity
   * @internal - Called by other services
   */
  async awardPoints(userId, points, xp, transactionType, referenceType = null, referenceId = null, description = '') {
    try {
      await promisePool.query(
        'CALL award_points(?, ?, ?, ?, ?, ?, ?)',
        [userId, points, xp, transactionType, referenceType, referenceId, description]
      );

      console.log(`[AchievementsService] Awarded ${points} points, ${xp} XP to user ${userId} for ${transactionType}`);

      return new ServiceResponseDTO(
        true,
        { points, xp },
        'Points awarded successfully'
      );
    } catch (error) {
      console.error('[AchievementsService] Award points error:', error.message);
      return new ErrorResponseDTO({
        message: error.message || 'Failed to award points',
        code: 'AWARD_POINTS_ERROR'
      });
    }
  }

  /**
   * Update user login streak
   * @internal - Called by student activity service
   */
  async updateStreak(userId) {
    try {
      await promisePool.query(
        'CALL update_streak(?)',
        [userId]
      );

      return new ServiceResponseDTO(
        true,
        null,
        'Streak updated successfully'
      );
    } catch (error) {
      console.error('[AchievementsService] Update streak error:', error.message);
      return new ErrorResponseDTO({
        message: error.message || 'Failed to update streak',
        code: 'UPDATE_STREAK_ERROR'
      });
    }
  }

  /**
   * Get user points summary
   */
  async getUserPoints(userId) {
    try {
      const [result] = await promisePool.query(
        'CALL get_user_points(?)',
        [userId]
      );

      const pointsData = result[0][0];

      if (!pointsData) {
        // Initialize user points if doesn't exist
        await promisePool.query(
          'INSERT INTO user_points (user_id, total_points, total_xp, current_level) VALUES (?, 0, 0, 1)',
          [userId]
        );

        // Retry
        const [retryResult] = await promisePool.query(
          'CALL get_user_points(?)',
          [userId]
        );

        return new ServiceResponseDTO(
          true,
          retryResult[0][0],
          'User points retrieved successfully'
        );
      }

      return new ServiceResponseDTO(
        true,
        pointsData,
        'User points retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve user points',
        code: 'USER_POINTS_FETCH_ERROR'
      });
    }
  }

  /**
   * Get point transaction history
   */
  async getPointHistory(userId, limit = 20, offset = 0) {
    try {
      const [result] = await promisePool.query(
        'CALL get_point_history(?, ?, ?)',
        [userId, limit, offset]
      );

      const history = result[0];

      return new ServiceResponseDTO(
        true,
        history,
        'Point history retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve point history',
        code: 'POINT_HISTORY_FETCH_ERROR'
      });
    }
  }

  /**
   * Get achievement statistics for user
   */
  async getAchievementStats(userId) {
    try {
      // First ensure user has achievements initialized
      await promisePool.query(
        'CALL check_achievements(?)',
        [userId]
      );

      const [result] = await promisePool.query(
        'CALL get_user_achievements_stats(?)',
        [userId]
      );

      const stats = result[0][0] || {
        total_achievements: 0,
        unlocked_count: 0,
        in_progress_count: 0,
        completion_percentage: 0
      };

      return new ServiceResponseDTO(
        true,
        stats,
        'Achievement stats retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve achievement stats',
        code: 'ACHIEVEMENT_STATS_FETCH_ERROR'
      });
    }
  }

  /**
   * Get unlocked achievements for user
   */
  async getUnlockedAchievements(userId) {
    try {
      const [result] = await promisePool.query(
        'CALL get_unlocked_achievements(?)',
        [userId]
      );

      const achievements = result[0];

      return new ServiceResponseDTO(
        true,
        achievements,
        'Unlocked achievements retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve unlocked achievements',
        code: 'UNLOCKED_ACHIEVEMENTS_FETCH_ERROR'
      });
    }
  }

  /**
   * Get in-progress achievements for user
   */
  async getInProgressAchievements(userId) {
    try {
      const [result] = await promisePool.query(
        'CALL get_inprogress_achievements(?)',
        [userId]
      );

      const achievements = result[0];

      return new ServiceResponseDTO(
        true,
        achievements,
        'In-progress achievements retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve in-progress achievements',
        code: 'INPROGRESS_ACHIEVEMENTS_FETCH_ERROR'
      });
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(period = 'all_time', limit = 10, offset = 0) {
    try {
      // Validate period
      const validPeriods = ['all_time', 'monthly', 'weekly', 'daily'];
      if (!validPeriods.includes(period)) {
        period = 'all_time';
      }

      const [result] = await promisePool.query(
        'CALL get_leaderboard(?, ?, ?)',
        [period, limit, offset]
      );

      const leaderboard = result[0];

      return new ServiceResponseDTO(
        true,
        leaderboard,
        'Leaderboard retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve leaderboard',
        code: 'LEADERBOARD_FETCH_ERROR'
      });
    }
  }

  /**
   * Check and update achievements for user
   * @internal - Called after major activities
   */
  async checkAchievements(userId) {
    try {
      await promisePool.query(
        'CALL check_achievements(?)',
        [userId]
      );

      return new ServiceResponseDTO(
        true,
        null,
        'Achievements checked successfully'
      );
    } catch (error) {
      console.error('[AchievementsService] Check achievements error:', error.message);
      return new ErrorResponseDTO({
        message: error.message || 'Failed to check achievements',
        code: 'CHECK_ACHIEVEMENTS_ERROR'
      });
    }
  }
}

module.exports = new AchievementsService();
