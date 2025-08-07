const { promisePool } = require('../../config/db');
const { eventSchema, eventIdSchema } = require('../../dto/instructor/event_dto');

class InstructorEventService {
  async createEvent(creatorId, data) {
    const { error } = eventSchema.validate(data);
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_create_event(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      creatorId,
      data.title,
      data.description,
      data.event_date,
      data.event_time,
      data.duration,
      data.event_type,
      data.meeting_link,
      data.meeting_address,
      data.max_attendees
    ]);
    return true;
  }

  async updateEvent(creatorId, data) {
    const { error } = eventSchema.validate(data);
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_update_event(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      data.event_id,
      creatorId,
      data.title,
      data.description,
      data.event_date,
      data.event_time,
      data.duration,
      data.event_type,
      data.meeting_link,
      data.meeting_address,
      data.max_attendees
    ]);
    return true;
  }

  async deleteEvent(creatorId, eventId) {
    const { error } = eventIdSchema.validate({ event_id: eventId });
    if (error) throw new Error(error.details[0].message);

    await promisePool.query('CALL instructor_delete_event(?, ?)', [eventId, creatorId]);
    return true;
  }

  async getMyUpcomingEvents(creatorId) {
    const [rows] = await promisePool.query('CALL instructor_get_my_upcoming_events(?)', [creatorId]);
    return rows[0];
  }

  async getMyPastEvents(creatorId) {
    const [rows] = await promisePool.query('CALL instructor_get_my_past_events(?)', [creatorId]);
    return rows[0];
  }

  async getEventAttendees(creatorId, eventId) {
    const { error } = eventIdSchema.validate({ event_id: eventId });
    if (error) throw new Error(error.details[0].message);

    const [rows] = await promisePool.query('CALL instructor_get_event_attendees(?, ?)', [eventId, creatorId]);
    return rows[0];
  }
}

module.exports = new InstructorEventService();