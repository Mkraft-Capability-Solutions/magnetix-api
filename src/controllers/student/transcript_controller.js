const transcriptService = require('../../services/student/transcript_service');

/**
 * Get transcript stats for student
 * GET /api/student/transcript/stats
 */
exports.getTranscriptStats = async (req, res, next) => {
  try {
    const response = await transcriptService.getTranscriptStats(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get transcript courses for student
 * GET /api/student/transcript/courses
 */
exports.getTranscriptCourses = async (req, res, next) => {
  try {
    const response = await transcriptService.getTranscriptCourses(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics statistics for student
 * GET /api/student/transcript/analytics-statistics
 */
exports.getAnalyticsStatistics = async (req, res, next) => {
  try {
    const response = await transcriptService.getAnalyticsStatistics(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly comparison for student
 * GET /api/student/transcript/monthly-comparison
 */
exports.getMonthlyComparison = async (req, res, next) => {
  try {
    const response = await transcriptService.getMonthlyComparison(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};
