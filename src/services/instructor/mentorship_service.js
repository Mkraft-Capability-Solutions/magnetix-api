const { promisePool } = require('../../config/db');
const { MentorshipRequestDTO, MenteeDTO, SessionRequestDTO } = require('../../dto/instructor/mentorship_dto');

class InstructorMentorshipService {
    async getMentorshipRequests(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_mentorship_requests(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new MentorshipRequestDTO(row));
    }

    async approveMentorshipRequest(mentorId, mentorshipId) {
        await promisePool.query(
            'CALL instructor_approve_mentorship_request(?, ?)',
            [mentorId, mentorshipId]
        );
        return true;
    }

    async rejectMentorshipRequest(mentorId, mentorshipId) {
        const [result] = await promisePool.query(
            'CALL instructor_reject_mentorship_request(?, ?)',
            [mentorId, mentorshipId]
        );
        if (result[0][0].success) {
            return true;
        }
        throw new Error('Failed to reject mentorship request');
    }

    async getAllMentees(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_all_mentees(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new MenteeDTO(row));
    }

    async getScheduleSessionRequests(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_schedule_session_requests(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new SessionRequestDTO(row));
    }

    async approveSessionRequest(mentorId, sessionId) {
        await promisePool.query(
            'CALL instructor_approve_session_request(?, ?)',
            [mentorId, sessionId]
        );
        return true;
    }

    async rejectSessionRequest(mentorId, sessionId) {
        await promisePool.query(
            'CALL instructor_reject_session_request(?, ?)',
            [mentorId, sessionId]
        );
        return true;
    }

    async getUpcomingScheduleSessions(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_upcoming_schedule_sessions(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new SessionRequestDTO(row));
    }

    async getPastScheduleSessions(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_past_schedule_sessions(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new SessionRequestDTO(row));
    }

    async scheduleSession(mentorId, data) {
        const [result] = await promisePool.query(
            'CALL instructor_schedule_session(?, ?, ?, ?, ?, ?, ?, ?)',
            [
                mentorId,
                data.menteeId,
                data.sessionDate,
                data.sessionTime,
                data.topic,
                data.description,
                data.url,
                data.duration
            ]
        );
        return result[0][0].session_id;
    }

    async updateScheduledSession(mentorId, sessionId, data) {
        await promisePool.query(
            'CALL instructor_update_scheduled_session(?, ?, ?, ?, ?, ?, ?)',
            [
                mentorId,
                sessionId,
                data.sessionDate,
                data.sessionTime,
                data.topic,
                data.description,
                data.url
            ]
        );
        return true;
    }
}

module.exports = new InstructorMentorshipService();