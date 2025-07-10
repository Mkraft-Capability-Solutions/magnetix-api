const { promisePool } = require('../../config/db');
const EventDTO = require('../../dto/event_dto');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class EventService {
  async getAllUpcomingEvents(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_upcoming_nonregistered_events(?)', [studentId]);
      const events = result[0].map(event => new EventDTO(event));
      return new ServiceResponseDTO(true, events);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async getUpcomingRegisteredEvents(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_upcoming_registered_events(?)', [studentId]);
      const events = result[0].map(event => new EventDTO(event));
      return new ServiceResponseDTO(true, events);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async getPastEvents(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_past_events(?)', [studentId]);
      const events = result[0].map(event => new EventDTO(event));
      return new ServiceResponseDTO(true, events);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }
        
async registerForEvent(studentId, eventId) {
  try {
    await promisePool.query('CALL register_student_for_event(?, ?)', [studentId, eventId]);
    return new ServiceResponseDTO(true, null, 'Successfully registered for the event');
  } catch (error) {
    if (error.message === 'Already registered for this event') {
      return new ErrorResponseDTO(error, 409);
    }
    return new ErrorResponseDTO(error);
  }
}
}

module.exports = new EventService();