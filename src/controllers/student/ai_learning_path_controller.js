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

/**
 * Add a new skill to track
 * POST /api/student/ai-learning-path/skills
 */
exports.addSkill = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.addSkill(req.user.uuid, req.body);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing skill
 * PUT /api/student/ai-learning-path/skills/:skillId
 */
exports.updateSkill = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const response = await aiLearningPathService.updateSkill(req.user.uuid, skillId, req.body);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a skill
 * DELETE /api/student/ai-learning-path/skills/:skillId
 */
exports.deleteSkill = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const response = await aiLearningPathService.deleteSkill(req.user.uuid, skillId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};
