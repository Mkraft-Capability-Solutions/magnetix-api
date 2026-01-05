const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const aiLearningPathController = require('../../controllers/student/ai_learning_path_controller');

/**
 * Get all learning paths for authenticated student
 * GET /api/student/ai-learning-path/learning-paths
 */
router.get('/learning-paths', authenticate, authorize(1), aiLearningPathController.getUserLearningPaths);

/**
 * Get detailed information about a specific learning path
 * GET /api/student/ai-learning-path/learning-paths/:pathId
 */
router.get('/learning-paths/:pathId', authenticate, authorize(1), aiLearningPathController.getLearningPathDetail);

/**
 * Get progress data for Progress tab (Tab 2)
 * GET /api/student/ai-learning-path/progress
 */
router.get('/progress', authenticate, authorize(1), aiLearningPathController.getProgressData);

/**
 * Get statistics data for Statistics tab (Tab 3)
 * GET /api/student/ai-learning-path/statistics
 */
router.get('/statistics', authenticate, authorize(1), aiLearningPathController.getStatisticsData);

/**
 * Add a new skill to track
 * POST /api/student/ai-learning-path/skills
 */
router.post('/skills', authenticate, authorize(1), aiLearningPathController.addSkill);

/**
 * Update an existing skill
 * PUT /api/student/ai-learning-path/skills/:skillId
 */
router.put('/skills/:skillId', authenticate, authorize(1), aiLearningPathController.updateSkill);

/**
 * Delete a skill
 * DELETE /api/student/ai-learning-path/skills/:skillId
 */
router.delete('/skills/:skillId', authenticate, authorize(1), aiLearningPathController.deleteSkill);

module.exports = router;
