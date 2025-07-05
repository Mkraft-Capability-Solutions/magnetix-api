const { promisePool } = require('../../config/db');

class EventService {
  async getAllUpcomingEvents(studentId) {
    const [result] = await promisePool.query('CALL get_student_upcoming_nonregistered_events(?)', [studentId]);
    return result[0];
  }

  async getUpcomingRegisteredEvents(studentId) {
    const [result] = await promisePool.query('CALL get_student_upcoming_registered_events(?)', [studentId]);
    return result[0];
    }

  async getPastEvents(studentId) {
        const [result] = await promisePool.query('CALL get_student_past_events(?)', [studentId]);
        return result[0];
        }
        
   async registerForEvent(studentId, eventId) {
    await promisePool.query('CALL register_student_for_event(?, ?)', [studentId, eventId]);
    }
}

module.exports = new EventService();