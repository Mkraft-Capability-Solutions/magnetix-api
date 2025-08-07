const { promisePool } = require('../../config/db');
const { mentorshipRequestSchema, sessionRequestSchema, scheduleSessionSchema, updateSessionSchema } = require('../../dto/instructor/mentorship_dto');

class InstructorMentorshipService {
  async getMentorshipRequests(mentorId) {
    const [rows] = await promisePool.query('CALL instructor_get_mentorship_requests(?)', [mentorId]);
    return rows[0];
  }

  async approveMentorshipRequest(mentorId, mentorshipId) {
    const { error } = mentorshipRequestSchema.validate({ mentorship_id: mentorshipId });
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_approve_mentorship_request(?, ?)', [mentorshipId, mentorId]);
    return true;
  }

  async rejectMentorshipRequest(mentorId, mentorshipId) {
    const { error } = mentorshipRequestSchema.validate({ mentorship_id: mentorshipId });
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_reject_mentorship_request(?, ?)', [mentorshipId, mentorId]);
    return true;
  }

  async getAllMentees(mentorId) {
    const [rows] = await promisePool.query('CALL instructor_get_all_mentees(?)', [mentorId]);
    return rows[0];
  }

  async getScheduleSessionRequests(mentorId) {
    const [rows] = await promisePool.query('CALL instructor_get_schedule_session_requests(?)', [mentorId]);
    return rows[0];
  }

  async approveSessionRequest(mentorId, sessionId) {
    const { error } = sessionRequestSchema.validate({ session_id: sessionId });
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_approve_session_request(?, ?)', [sessionId, mentorId]);
    return true;
  }

  async rejectSessionRequest(mentorId, sessionId) {
    const { error } = sessionRequestSchema.validate({ session_id: sessionId });
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_reject_session_request(?, ?)', [sessionId, mentorId]);
    return true;
  }

  async getUpcomingScheduleSessions(mentorId) {
    const [rows] = await promisePool.query('CALL instructor_get_upcoming_schedule_sessions(?)', [mentorId]);
    return rows[0];
  }

  async getPastScheduleSessions(mentorId) {
    const [rows] = await promisePool.query('CALL instructor_get_past_schedule_sessions(?)', [mentorId]);
    return rows[0];
  }

  async scheduleSession(mentorId, data) {
    const { error } = scheduleSessionSchema.validate(data);
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_schedule_session(?, ?, ?, ?, ?, ?, ?, ?)', [
      mentorId,
      data.mentee_id,
      data.session_date,
      data.session_time,
      data.duration,
      data.session_type,
      data.meeting_link,
      data.meeting_address
    ]);
    return true;
  }

  async updateScheduledSession(mentorId, data) {
    const { error } = updateSessionSchema.validate(data);
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_update_scheduled_session(?, ?, ?, ?, ?, ?, ?, ?)', [
      data.session_id,
      mentorId,
      data.session_date,
      data.session_time,
      data.duration,
      data.session_type,
      data.meeting_link,
      data.meeting_address
    ]);
    return true;
  }
}

module.exports = new InstructorMentorshipService();