class EventDTO {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.start_date = data.start_date;
        this.start_time = data.start_time;
        this.end_date = data.end_date;
        this.end_time = data.end_time;
        this.audience_type = data.event_audience_type_id;
        this.speakers = data.speakers;
        this.event_category = data.event_category;
        this.event_thumbnail = data.event_thumbnail;
        this.online_event = data.online_event;
        this.event_venue = data.event_venue;
        this.max_limit = data.max_limit;
        this.attendees_count = data.attendees_count || 0;
        this.url = data.url;
        this.created_date = data.created_date;
    }
}

class EventAttendeeDTO {
    constructor(data) {
        this.id = data.id;
        this.eventId = data.event_id;
        this.recipientId = data.recipient_id;
        this.recipientName = data.recipient_name || `${data.attendee_first_name} ${data.attendee_last_name}`;
        this.recipientEmail = data.recipient_email || data.attendee_email;
        this.registeredAt = data.registered_at;
    }
}

module.exports = {
    EventDTO,
    EventAttendeeDTO
};