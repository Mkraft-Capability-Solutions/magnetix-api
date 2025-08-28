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

      // Fetch complete event details for email
      const [eventDetailsResult] = await promisePool.query(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.start_date,
          e.start_time,
          e.end_date,
          e.end_time,
          e.event_venue,
          e.url,
          e.speakers,
          e.event_category,
          e.event_thumbnail,
          e.online_event,
          e.max_limit,
          COUNT(ea.id) as attendees_count
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.id = ?
        GROUP BY e.id
      `, [eventId]);

      const eventDetails = eventDetailsResult[0];

      return new ServiceResponseDTO(true, {
        message: 'Successfully registered for event',
        user: {
          uuid: recipientId,
          email: registrationData.email,
          full_name: registrationData.full_name,
          first_name: registrationData.first_name || registrationData.full_name?.split(' ')[0] || 'Student',
          role_id: registrationData.role_id
        },
        event: eventDetails,
        event_id: eventId
      });
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

}

module.exports = new EventService();