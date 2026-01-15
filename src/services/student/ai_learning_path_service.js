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

  /**
   * Add a new skill for the user to track
   * @param {string} userId - User UUID
   * @param {object} skillData - Skill data (name, level, category, color)
   * @returns {ServiceResponseDTO} Newly created skill
   */
  async addSkill(userId, skillData) {
    try {
      const { name, level, category, color } = skillData;

      // Validate required fields
      if (!name || !name.trim()) {
        return new ErrorResponseDTO({
          message: 'Skill name is required',
          code: 'VALIDATION_ERROR',
          status: 400
        });
      }

      const [result] = await promisePool.query(
        'CALL add_user_skill(?, ?, ?, ?, ?)',
        [userId, name.trim(), level.toLowerCase(), category, color]
      );

      const newSkill = result[0][0];

      return new ServiceResponseDTO(true, newSkill, 'Skill added successfully');
    } catch (error) {
      // Handle duplicate skill error
      if (error.code === 'ER_DUP_ENTRY') {
        return new ErrorResponseDTO({
          message: 'You are already tracking this skill',
          code: 'DUPLICATE_SKILL',
          status: 409
        });
      }
      return new ErrorResponseDTO({
        message: error.message || 'Failed to add skill',
        code: 'ADD_SKILL_ERROR'
      });
    }
  }

  /**
   * Update an existing skill
   * @param {string} userId - User UUID
   * @param {number} skillId - Skill ID
   * @param {object} skillData - Updated skill data
   * @returns {ServiceResponseDTO} Updated skill
   */
  async updateSkill(userId, skillId, skillData) {
    try {
      const { name, level, category, color } = skillData;

      if (!name || !name.trim()) {
        return new ErrorResponseDTO({
          message: 'Skill name is required',
          code: 'VALIDATION_ERROR',
          status: 400
        });
      }

      const [result] = await promisePool.query(
        'CALL update_user_skill(?, ?, ?, ?, ?, ?)',
        [skillId, userId, name.trim(), level.toLowerCase(), category, color]
      );

      const updatedSkill = result[0][0];

      if (!updatedSkill) {
        return new ErrorResponseDTO({
          message: 'Skill not found or you do not have permission to edit it',
          code: 'SKILL_NOT_FOUND',
          status: 404
        });
      }

      return new ServiceResponseDTO(true, updatedSkill, 'Skill updated successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return new ErrorResponseDTO({
          message: 'A skill with this name already exists',
          code: 'DUPLICATE_SKILL',
          status: 409
        });
      }
      return new ErrorResponseDTO({
        message: error.message || 'Failed to update skill',
        code: 'UPDATE_SKILL_ERROR'
      });
    }
  }

  /**
   * Delete a skill
   * @param {string} userId - User UUID
   * @param {number} skillId - Skill ID
   * @returns {ServiceResponseDTO} Deletion result
   */
  async deleteSkill(userId, skillId) {
    try {
      const [result] = await promisePool.query(
        'CALL delete_user_skill(?, ?)',
        [skillId, userId]
      );

      const { deleted } = result[0][0];

      if (deleted === 0) {
        return new ErrorResponseDTO({
          message: 'Skill not found or you do not have permission to delete it',
          code: 'SKILL_NOT_FOUND',
          status: 404
        });
      }

      return new ServiceResponseDTO(true, { deleted: true }, 'Skill deleted successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to delete skill',
        code: 'DELETE_SKILL_ERROR'
      });
    }
  }

  /**
   * Search trainees by name or email (for sharing learning paths)
   * @param {string} currentUserId - Current user's UUID (to exclude from results)
   * @param {string} searchQuery - Search query string
   * @returns {ServiceResponseDTO} Array of matching trainees
   */
  async searchTrainees(currentUserId, searchQuery) {
    try {
      const [result] = await promisePool.query(
        'CALL search_trainees(?, ?)',
        [currentUserId, searchQuery]
      );

      const trainees = result[0];

      return new ServiceResponseDTO(true, trainees, 'Trainees found successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to search trainees',
        code: 'SEARCH_TRAINEES_ERROR'
      });
    }
  }

  /**
   * Share (copy) a learning path to another trainee
   * @param {number} pathId - Learning path ID to share
   * @param {string} fromUserId - User who is sharing
   * @param {string} toUserId - User to share with
   * @returns {ServiceResponseDTO} Newly created learning path copy
   */
  async shareLearningPath(pathId, fromUserId, toUserId) {
    try {
      const [result] = await promisePool.query(
        'CALL copy_learning_path_to_user(?, ?, ?)',
        [pathId, fromUserId, toUserId]
      );

      const newLearningPath = result[0][0];

      if (!newLearningPath) {
        return new ErrorResponseDTO({
          message: 'Failed to share learning path',
          code: 'SHARE_FAILED',
          status: 500
        });
      }

      return new ServiceResponseDTO(true, newLearningPath, 'Learning path shared successfully');
    } catch (error) {
      // Handle specific error from stored procedure
      if (error.sqlState === '45000') {
        return new ErrorResponseDTO({
          message: error.message || 'Learning path not found or access denied',
          code: 'ACCESS_DENIED',
          status: 403
        });
      }
      return new ErrorResponseDTO({
        message: error.message || 'Failed to share learning path',
        code: 'SHARE_ERROR'
      });
    }
  }
}

module.exports = new AILearningPathService();
