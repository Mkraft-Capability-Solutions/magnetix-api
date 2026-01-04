const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const achievementsController = require('../../controllers/student/achievements_controller');

/**
 * Get achievement statistics for authenticated student
 * GET /api/student/achievements/stats
 */
router.get('/stats', authenticate, authorize(1), achievementsController.getAchievementStats);

/**
 * Get unlocked achievements for authenticated student
 * GET /api/student/achievements/unlocked
 */
router.get('/unlocked', authenticate, authorize(1), achievementsController.getUnlockedAchievements);

/**
 * Get in-progress achievements for authenticated student
 * GET /api/student/achievements/inprogress
 */
router.get('/inprogress', authenticate, authorize(1), achievementsController.getInProgressAchievements);

/**
 * Get leaderboard
 * GET /api/student/achievements/leaderboard?period=all_time&limit=10&offset=0
 */
router.get('/leaderboard', authenticate, authorize(1), achievementsController.getLeaderboard);

/**
 * Get user points summary
 * GET /api/student/achievements/points/summary
 */
router.get('/points/summary', authenticate, authorize(1), achievementsController.getPointsSummary);

/**
 * Get point transaction history
 * GET /api/student/achievements/points/history?limit=20&offset=0
 */
router.get('/points/history', authenticate, authorize(1), achievementsController.getPointHistory);

module.exports = router;
