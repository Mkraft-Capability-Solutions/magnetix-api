const { promisePool } = require('../../config/db');

class MentorshipService {
  async getAssignedMentors(studentId) {
    const [result] = await promisePool.query('CALL get_student_assigned_mentors(?)', [studentId]);
    return result[0];
  }

  async findAvailableMentors(studentId) {
    const [result] = await promisePool.query('CALL get_available_mentors_for_student(?)', [studentId]);
    return result[0];
    }

  async requestMentorship(studentId, mentorUserId) {
    await promisePool.query('CALL request_mentorship(?, ?)', [studentId, mentorUserId]);
    }

  async getUpcomingSessions(studentId) {
    const [result] = await promisePool.query('CALL get_student_upcoming_sessions(?)', [studentId]);
    return result[0];
    }

  async getPastSessions(studentId) {
    const [result] = await promisePool.query('CALL get_student_past_sessions(?)', [studentId]);
    return result[0];
    }

  async requestScheduleSession(studentId, mentorId, sessionDate, sessionTime, topic, description) {
    await promisePool.query(
        'CALL request_mentorship_session(?, ?, ?, ?, ?, ?)', 
        [studentId, mentorId, sessionDate, sessionTime, topic, description]
    );
    }


}

module.exports = new MentorshipService();