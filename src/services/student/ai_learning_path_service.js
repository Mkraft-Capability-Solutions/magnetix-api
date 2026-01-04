const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class AILearningPathService {
  /**
   * Get all learning paths for a user
   * @param {string} userId - User UUID
   * @returns {ServiceResponseDTO} Learning paths array
   */
  async getUserLearningPaths(userId) {
    try {
      const [result] = await promisePool.query('CALL get_user_learning_paths(?)', [userId]);
      const learningPaths = result[0];

      return new ServiceResponseDTO(true, learningPaths, 'Learning paths retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve learning paths',
        code: 'GET_LEARNING_PATHS_ERROR'
      });
    }
  }

  /**
   * Get detailed information about a specific learning path
   * @param {number} pathId - Learning path ID
   * @param {string} userId - User UUID
   * @returns {ServiceResponseDTO} Learning path details with modules and topics
   */
  async getLearningPathDetail(pathId, userId) {
    try {
      const [result] = await promisePool.query('CALL get_learning_path_detail(?, ?)', [pathId, userId]);

      // First result set: learning path details
      const pathDetails = result[0][0];

      if (!pathDetails) {
        return new ErrorResponseDTO({
          message: 'Learning path not found',
          code: 'LEARNING_PATH_NOT_FOUND'
        });
      }

      // Second result set: modules with topics (as JSON)
      const modules = result[1].map(module => ({
        ...module,
        topics: module.topics
          ? (typeof module.topics === 'string' ? JSON.parse(module.topics) : module.topics)
          : []
      }));

      const detailData = {
        ...pathDetails,
        modules
      };

      return new ServiceResponseDTO(true, detailData, 'Learning path details retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve learning path details',
        code: 'GET_PATH_DETAIL_ERROR'
      });
    }
  }

  /**
   * Get progress data for Progress tab (Tab 2)
   * @param {string} userId - User UUID
   * @returns {ServiceResponseDTO} Stats and learning paths for progress view
   */
  async getProgressData(userId) {
    try {
      const [result] = await promisePool.query('CALL get_ai_progress_data(?)', [userId]);

      // First result set: Stats (4 stat cards)
      const stats = result[0];

      // Second result set: Learning paths
      const learningPaths = result[1];

      const progressData = {
        stats,
        learningPaths
      };

      return new ServiceResponseDTO(true, progressData, 'Progress data retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve progress data',
        code: 'GET_PROGRESS_DATA_ERROR'
      });
    }
  }

  /**
   * Get statistics data for Statistics tab (Tab 3)
   * @param {string} userId - User UUID
   * @returns {ServiceResponseDTO} Stats, courses, and skills for statistics view
   */
  async getStatisticsData(userId) {
    try {
      const [result] = await promisePool.query('CALL get_ai_statistics_data(?)', [userId]);

      // First result set: Stats (4 stat cards)
      const stats = result[0];

      // Second result set: Completed courses
      const courses = result[1];

      // Third result set: Skills
      const skills = result[2];

      const statisticsData = {
        stats,
        courses,
        skills
      };

      return new ServiceResponseDTO(true, statisticsData, 'Statistics data retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve statistics data',
        code: 'GET_STATISTICS_DATA_ERROR'
      });
    }
  }
}

module.exports = new AILearningPathService();
