const mentorshipService = require('../../services/student/mentorship_service');

exports.getAssignedMentors = async (req, res, next) => {
  try {
    const response = await mentorshipService.getAssignedMentors(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.findAvailableMentors = async (req, res, next) => {
  try {
    const response = await mentorshipService.findAvailableMentors(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getFeaturedMentors = async (req, res, next) => {
  try {
    const response = await mentorshipService.getFeaturedMentors(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.requestMentorship = async (req, res, next) => {
  try {
    const response = await mentorshipService.requestMentorship(req.user.uuid, req.params.mentorId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getUpcomingSessions = async (req, res, next) => {
  try {
    const response = await mentorshipService.getUpcomingSessions(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getPastSessions = async (req, res, next) => {
  try {
    const response = await mentorshipService.getPastSessions(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.requestScheduleSession = async (req, res, next) => {
  try {
    const { mentorId, sessionDate, sessionTime, topic, description, url } = req.body;
    
    if (!mentorId || !sessionDate || !sessionTime || !topic || !url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const response = await mentorshipService.requestScheduleSession(
      req.user.uuid, 
      mentorId, 
      sessionDate, 
      sessionTime, 
      topic, 
      description,
      url
    );
    
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.isMentorshipRequestDeleted = async (req, res, next) => {
  try {
    const response = await mentorshipService.isMentorshipRequestDeleted(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getMentorDetails = async (req, res, next) => {
  try {
    const response = await mentorshipService.getMentorDetails(req.params.mentorId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};