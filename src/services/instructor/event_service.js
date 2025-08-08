const { promisePool } = require('../../config/db');
const { EventDTO, EventAttendeeDTO } = require('../../dto/instructor/event_dto');

class InstructorEventService {
    async createEvent(creatorId, data) {
        if (!data.title) {
            throw new Error('Title is required');
        }

        const [result] = await promisePool.query(
            'CALL instructor_create_event(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                creatorId,
                data.title,
                data.description,
                data.startDate,
                data.startTime,
                data.endDate,
                data.endTime,
                data.eventAudienceTypeId,
                data.speakers,
                data.eventCategory,
                data.eventThumbnail,
                data.onlineEvent || 0,
                data.eventVenue,
                data.maxLimit,
                data.url
            ]
        );
        return result[0][0].event_id;
    }

    async updateEvent(creatorId, eventId, data) {
        await promisePool.query(
            'CALL instructor_update_event(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [
                creatorId,
                eventId,
                data.title,
                data.description,
                data.startDate,
                data.startTime,
                data.endDate,
                data.endTime,
                data.eventAudienceTypeId,
                data.speakers || null,
                data.eventCategory || null,
                data.eventThumbnail || null,
                data.onlineEvent || 0,
                data.eventVenue || null,
                data.maxLimit,
                data.url || null
            ]
        );

            return true;
        }

    async deleteEvent(creatorId, eventId) {
        await promisePool.query(
            'CALL instructor_delete_event(?, ?)',
            [creatorId, eventId]
        );
        return true;
    }

    async getMyUpcomingEvents(creatorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_my_upcoming_events(?, ?, ?)',
            [creatorId, limit, offset]
        );
        return rows[0].map(row => new EventDTO(row));
    }

    async getMyPastEvents(creatorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_my_past_events(?, ?, ?)',
            [creatorId, limit, offset]
        );
        return rows[0].map(row => new EventDTO(row));
    }

    async getEventAttendees(eventId) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_event_attendees(?)',
            [eventId]
        );
        return rows[0].map(row => new EventAttendeeDTO(row));
    }
}

module.exports = new InstructorEventService();