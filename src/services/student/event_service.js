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
        
   async registerForEvent(recipientId, eventId) {
    try {
      const [result] = await promisePool.query('CALL register_for_event(?, ?)', [recipientId, eventId]);
      const registrationData = result[0][0]; // Assuming stored procedure returns a single row with user and event details
      if (!registrationData.success) {
        return new ErrorResponseDTO({
          status: registrationData.status || 500,
          message: registrationData.message
        });
      }
      return new ServiceResponseDTO(true, {
        message: 'Successfully registered for event',
        user: {
          uuid: recipientId,
          email: registrationData.email,
          full_name: registrationData.full_name,
          role_id: registrationData.role_id
        },
        event_id: eventId
      });
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

}

module.exports = new EventService();