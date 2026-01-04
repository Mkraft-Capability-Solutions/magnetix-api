const aiLearningPathService = require('../../services/student/ai_learning_path_service');

/**
 * Get all learning paths for the authenticated user
 * GET /api/student/ai-learning-path/learning-paths
 */
exports.getUserLearningPaths = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.getUserLearningPaths(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed information about a specific learning path
 * GET /api/student/ai-learning-path/learning-paths/:pathId
 */
exports.getLearningPathDetail = async (req, res, next) => {
  try {
    const { pathId } = req.params;
    const response = await aiLearningPathService.getLearningPathDetail(pathId, req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 404).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress data for Progress tab (Tab 2)
 * GET /api/student/ai-learning-path/progress
 */
exports.getProgressData = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.getProgressData(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get statistics data for Statistics tab (Tab 3)
 * GET /api/student/ai-learning-path/statistics
 */
exports.getStatisticsData = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.getStatisticsData(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};
