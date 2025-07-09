const activityService = require('../services/student_activity_service');

exports.logSession = async (req, res, next) => {
  try {
    const userId = req.user.uuid;
    await activityService.logStudentSession(userId);
    res.json({
      success: true,
      message: 'Session logged successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getWeeklyHours = async (req, res, next) => {
  try {
    const userId = req.user.uuid;
    const weeklyHours = await activityService.getStudentWeeklyHours(userId);
    res.json({
      success: true,
      weeklyHours
    });
  } catch (error) {
    next(error);
  }
};