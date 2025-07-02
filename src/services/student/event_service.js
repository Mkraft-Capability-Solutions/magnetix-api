const { promisePool } = require('../../config/db');
const { EventDTO, EventAttendeeDTO } = require('../../dto/event_dto');

class EventService {
  // Get all upcoming events not registered by student
  async getAllUpcomingEvents(studentId) {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const [rows] = await promisePool.query(`
      SELECT e.*, 
        CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
        eat.title as audience_type,
        0 as is_registered
      FROM events e
      JOIN users u ON e.creator_id = u.uuid
      JOIN event_audience_type eat ON e.event_audience_type_id = eat.id
      WHERE e.start_date >= ?
      AND e.id NOT IN (
        SELECT event_id FROM event_attendees WHERE recipient_id = ?
      )
      AND (e.event_audience_type_id = 1 OR 
          (e.event_audience_type_id = 2 AND e.creator_id = ?))
      AND (e.max_limit = 0 OR e.attendees_count < e.max_limit)
      ORDER BY e.start_date, e.start_time
    `, [currentDate, studentId, studentId]);

    return rows.map(event => new EventDTO(event));
  }

  // Get upcoming events student is registered for
  async getUpcomingRegisteredEvents(studentId) {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const [rows] = await promisePool.query(`
      SELECT e.*, 
        CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
        eat.title as audience_type,
        ea.registered_at,
        1 as is_registered
      FROM event_attendees ea
      JOIN events e ON ea.event_id = e.id
      JOIN users u ON e.creator_id = u.uuid
      JOIN event_audience_type eat ON e.event_audience_type_id = eat.id
      WHERE ea.recipient_id = ?
      AND e.start_date >= ?
      ORDER BY e.start_date, e.start_time
    `, [studentId, currentDate]);

    return rows.map(event => new EventDTO(event));
  }

  // Get past events student participated in
  async getPastEvents(studentId) {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const [rows] = await promisePool.query(`
      SELECT e.*, 
        CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
        eat.title as audience_type,
        ea.registered_at,
        1 as is_registered
      FROM event_attendees ea
      JOIN events e ON ea.event_id = e.id
      JOIN users u ON e.creator_id = u.uuid
      JOIN event_audience_type eat ON e.event_audience_type_id = eat.id
      WHERE ea.recipient_id = ?
      AND e.start_date < ?
      ORDER BY e.start_date DESC, e.start_time DESC
    `, [studentId, currentDate]);

    return rows.map(event => new EventDTO(event));
  }

  // Register for an event
  async registerForEvent(studentId, eventId) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Get user details
      const [userRows] = await connection.query(
        `SELECT u.email, 
         CONCAT(s.first_name, ' ', s.last_name) as full_name
         FROM users u
         LEFT JOIN students s ON s.user_id = u.uuid
         WHERE u.uuid = ?`,
        [studentId]
      );

      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      const user = userRows[0];

      // Check if already registered
      const [existing] = await connection.query(
        'SELECT * FROM event_attendees WHERE event_id = ? AND recipient_id = ?',
        [eventId, studentId]
      );

      if (existing.length > 0) {
        throw new Error('Already registered for this event');
      }

      // Check event availability
      const [event] = await connection.query(
        `SELECT id, max_limit, attendees_count, title, event_thumbnail
         FROM events 
         WHERE id = ? 
         AND (max_limit = 0 OR attendees_count < max_limit)`,
        [eventId]
      );

      if (event.length === 0) {
        throw new Error('Event not available or reached maximum capacity');
      }

      // Register for event
      await connection.query(
        `INSERT INTO event_attendees 
         (event_id, recipient_id, recipient_name, recipient_email) 
         VALUES (?, ?, ?, ?)`,
        [eventId, studentId, user.full_name, user.email]
      );

      // Update attendees count
      await connection.query(
        'UPDATE events SET attendees_count = attendees_count + 1 WHERE id = ?',
        [eventId]
      );

      await connection.commit();

      return new EventAttendeeDTO({
        event_id: eventId,
        recipient_id: studentId,
        recipient_name: user.full_name,
        recipient_email: user.email,
        event_title: event[0].title,
        event_thumbnail: event[0].event_thumbnail
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new EventService();