const achievementsService = require('../../services/student/achievements_service');

/**
 * Get achievement statistics
 * GET /api/student/achievements/stats
 */
exports.getAchievementStats = async (req, res, next) => {
  try {
    const response = await achievementsService.getAchievementStats(req.user.uuid);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get unlocked achievements
 * GET /api/student/achievements/unlocked
 */
exports.getUnlockedAchievements = async (req, res, next) => {
  try {
    const response = await achievementsService.getUnlockedAchievements(req.user.uuid);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get in-progress achievements
 * GET /api/student/achievements/inprogress
 */
exports.getInProgressAchievements = async (req, res, next) => {
  try {
    const response = await achievementsService.getInProgressAchievements(req.user.uuid);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get leaderboard
 * GET /api/student/achievements/leaderboard?period=all_time&limit=10&offset=0
 */
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all_time', limit = 10, offset = 0 } = req.query;

    const response = await achievementsService.getLeaderboard(
      period,
      parseInt(limit),
      parseInt(offset)
    );

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user points summary
 * GET /api/student/achievements/points/summary
 */
exports.getPointsSummary = async (req, res, next) => {
  try {
    const response = await achievementsService.getUserPoints(req.user.uuid);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get point transaction history
 * GET /api/student/achievements/points/history?limit=20&offset=0
 */
exports.getPointHistory = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const response = await achievementsService.getPointHistory(
      req.user.uuid,
      parseInt(limit),
      parseInt(offset)
    );

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};
