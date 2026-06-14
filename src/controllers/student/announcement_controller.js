const announcementService = require('../../services/student/announcement_service');

/**
 * Get announcements for student
 * GET /api/student/announcements
 */
exports.getAnnouncements = async (req, res, next) => {
  try {
    const response = await announcementService.getAnnouncements(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};
