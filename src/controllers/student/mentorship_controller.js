const mentorshipService = require('../../services/student/mentorship_service');

exports.getAssignedMentors = async (req, res, next) => {
  try {
    const mentors = await mentorshipService.getAssignedMentors(req.user.uuid);
    res.json({
      success: true,
      data: mentors
    });
  } catch (error) {
    next(error);
  }
};

exports.findAvailableMentors = async (req, res, next) => {
  try {
    const mentors = await mentorshipService.findAvailableMentors(req.user.uuid);
    res.json({
      success: true,
      data: mentors
    });
  } catch (error) {
    next(error);
  }
};

exports.requestMentorship = async (req, res, next) => {
  try {
    await mentorshipService.requestMentorship(req.user.uuid, req.params.mentorId);
    res.json({
      success: true,
      message: 'Mentorship request sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getUpcomingSessions = async (req, res, next) => {
  try {
    const sessions = await mentorshipService.getUpcomingSessions(req.user.uuid);
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

exports.getPastSessions = async (req, res, next) => {
  try {
    const sessions = await mentorshipService.getPastSessions(req.user.uuid);
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

exports.requestScheduleSession = async (req, res, next) => {
  try {
    const { mentorId, sessionDate, sessionTime, topic, description } = req.body;
    
    if (!mentorId || !sessionDate || !sessionTime || !topic) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    await mentorshipService.requestScheduleSession(
      req.user.uuid, 
      mentorId, 
      sessionDate, 
      sessionTime, 
      topic, 
      description
    );
    res.json({
      success: true,
      message: 'Session request submitted successfully'
    });
  } catch (error) {
    if (error.message === 'No active mentorship relationship with this mentor') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};