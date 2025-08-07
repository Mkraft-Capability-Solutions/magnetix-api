const InstructorMentorshipService = require('../../services/instructor/mentorship_service');
const { mentorshipRequestSchema, sessionRequestSchema } = require('../../dto/instructor/mentorship_dto');

exports.getMentorshipRequests = async (req, res, next) => {
  try {
    const mentorId = req.user.uuid;
    const requests = await InstructorMentorshipService.getMentorshipRequests(mentorId);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.approveMentorshipRequest = async (req, res, next) => {
  try {
    const { error } = mentorshipRequestSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mentorId = req.user.uuid;
    await InstructorMentorshipService.approveMentorshipRequest(mentorId, req.body.mentorship_id);
    res.json({ success: true, message: 'Mentorship request approved successfully' });
  } catch (error) {
    next(error);
  }
};

exports.rejectMentorshipRequest = async (req, res, next) => {
  try {
    const { error } = mentorshipRequestSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mentorId = req.user.uuid;
    await InstructorMentorshipService.rejectMentorshipRequest(mentorId, req.body.mentorship_id);
    res.json({ success: true, message: 'Mentorship request rejected successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getAllMentees = async (req, res, next) => {
  try {
    const mentorId = req.user.uuid;
    const mentees = await InstructorMentorshipService.getAllMentees(mentorId);
    res.json({ success: true, data: mentees });
  } catch (error) {
    next(error);
  }
};

exports.getScheduleSessionRequests = async (req, res, next) => {
  try {
    const mentorId = req.user.uuid;
    const requests = await InstructorMentorshipService.getScheduleSessionRequests(mentorId);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.approveSessionRequest = async (req, res, next) => {
  try {
    const { error } = sessionRequestSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mentorId = req.user.uuid;
    await InstructorMentorshipService.approveSessionRequest(mentorId, req.body.session_id);
    res.json({ success: true, message: 'Session request approved successfully' });
  } catch (error) {
    next(error);
  }
};

exports.rejectSessionRequest = async (req, res, next) => {
  try {
    const { error } = sessionRequestSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mentorId = req.user.uuid;
    await InstructorMentorshipService.rejectSessionRequest(mentorId, req.body.session_id);
    res.json({ success: true, message: 'Session request rejected successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getUpcomingScheduleSessions = async (req, res, next) => {
  try {
    const mentorId = req.user.uuid;
    const sessions = await InstructorMentorshipService.getUpcomingScheduleSessions(mentorId);
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

exports.getPastScheduleSessions = async (req, res, next) => {
  try {
    const mentorId = req.user.uuid;
    const sessions = await InstructorMentorshipService.getPastScheduleSessions(mentorId);
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

exports.scheduleSession = async (req, res, next) => {
  try {
    const mentorId = req.user.uuid;
    await InstructorMentorshipService.scheduleSession(mentorId, req.body);
    res.json({ success: true, message: 'Session scheduled successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateScheduledSession = async (req, res, next) => {
  try {
    const mentorId = req.user.uuid;
    await InstructorMentorshipService.updateScheduledSession(mentorId, req.body);
    res.json({ success: true, message: 'Session updated successfully' });
  } catch (error) {
    next(error);
  }
};