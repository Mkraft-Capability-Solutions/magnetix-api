const mentorshipService = require('../../services/student/mentorship_service');

// Get assigned mentors
exports.getYourMentor = async (req, res, next) => {
  try {
    const mentors = await mentorshipService.getYourMentor(req.user.uuid);
    res.json(mentors);
  } catch (error) {
    next(error);
  }
};

// Find available mentors
exports.findYourMentors = async (req, res, next) => {
  try {
    const mentors = await mentorshipService.findYourMentors(req.user.uuid);
    res.json(mentors);
  } catch (error) {
    next(error);
  }
};

// Request mentorship
exports.requestMentorship = async (req, res, next) => {
  try {
    const { mentorId } = req.body;
    await mentorshipService.requestMentorship(req.user.uuid, mentorId);
    res.json({ success: true, message: 'Mentorship request sent' });
  } catch (error) {
    next(error);
  }
};