const { promisePool } = require('../../config/db');
const { MentorDTO, MentorshipDTO, SessionDTO } = require('../../dto/mentorship_dto');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class MentorshipService {
  async getAssignedMentors(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_assigned_mentors(?)', [studentId]);
      const mentors = result[0].map(mentor => new MentorshipDTO(mentor));
      return new ServiceResponseDTO(true, mentors);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async findAvailableMentors(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_available_mentors_for_student(?)', [studentId]);
      const mentors = result[0].map(mentor => new MentorDTO(mentor));
      return new ServiceResponseDTO(true, mentors);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async requestMentorship(studentId, mentorUserId) {
    try {
      await promisePool.query('CALL request_mentorship(?, ?)', [studentId, mentorUserId]);
      return new ServiceResponseDTO(true, null, 'Mentorship request sent successfully');
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async getUpcomingSessions(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_upcoming_sessions(?)', [studentId]);
      const sessions = result[0].map(session => new SessionDTO(session));
      return new ServiceResponseDTO(true, sessions);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async getPastSessions(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_past_sessions(?)', [studentId]);
      const sessions = result[0].map(session => new SessionDTO(session));
      return new ServiceResponseDTO(true, sessions);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async requestScheduleSession(studentId, mentorId, sessionDate, sessionTime, topic, description, url) {
  try {
    await promisePool.query(
      'CALL request_mentorship_session(?, ?, ?, ?, ?, ?, ?)', 
      [studentId, mentorId, sessionDate, sessionTime, topic, description, url]
    );
    return new ServiceResponseDTO(true, null, 'Session request submitted successfully');
  } catch (error) {
    if (error.message === 'No active mentorship relationship with this mentor') {
      return new ErrorResponseDTO(error, 400);
    }
    return new ErrorResponseDTO(error);
  }
}

async isMentorshipRequestDeleted(studentId) {
  try {
    const [result] = await promisePool.query(
      'CALL is_mentorship_request_deleted(?)',
      [studentId]
    );
    const isDeleted = result[0][0].result === 1;
    return new ServiceResponseDTO(true, { isDeleted });
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}


}

module.exports = new MentorshipService();