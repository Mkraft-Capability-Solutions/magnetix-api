// controllers/student/calendar_controller.js
const calendarService = require('../../services/student/calendar_service');

exports.getCalendarData = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const studentId = req.user.uuid;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year parameters are required'
      });
    }

    const response = await calendarService.getCalendarData(studentId, month, year);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};