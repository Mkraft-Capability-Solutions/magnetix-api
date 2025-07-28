// services/student/calendar_service.js
const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class CalendarService {
  async getCalendarData(studentId, month, year) {
    try {
      // Get events
      const [eventsResult] = await promisePool.query(
        'CALL get_student_events_for_month(?, ?, ?)',
        [studentId, month, year]
      );
      
      // Get scheduled sessions
      const [sessionsResult] = await promisePool.query(
        'CALL get_student_sessions_for_month(?, ?, ?)',
        [studentId, month, year]
      );
      
      // Get ILTS sessions (if you have them)
      const [iltsResult] = await promisePool.query(
        'CALL get_student_ilts_for_month(?, ?, ?)',
        [studentId, month, year]
      );
      
      // Get assessments (if you have them)
      const [assessmentsResult] = await promisePool.query(
        'CALL get_student_assessments_for_month(?, ?, ?)',
        [studentId, month, year]
      );

      return new ServiceResponseDTO(true, {
        events: eventsResult[0] || [],
        sessions: sessionsResult[0] || [],
        ilts: iltsResult[0] || [],
        assessments: assessmentsResult[0] || []
      });
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }
}

module.exports = new CalendarService();