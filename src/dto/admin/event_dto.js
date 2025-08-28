class AdminEventDTO {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.startDate = data.start_date;
        this.startTime = data.start_time;
        this.endDate = data.end_date;
        this.endTime = data.end_time;
        this.eventAudienceTypeId = data.event_audience_type_id;
        this.speakers = data.speakers;
        this.eventCategory = data.event_category;
        this.eventThumbnail = data.event_thumbnail;
        this.onlineEvent = data.online_event;
        this.eventVenue = data.event_venue;
        this.maxLimit = data.max_limit;
        this.attendeesCount = data.attendees_count || 0;
        this.url = data.url;
        this.createdDate = data.created_date;
        this.lastUpdated = data.last_updated;
        this.creatorId = data.creator_id;
        this.creatorName = data.creator_name || `${data.creator_first_name || ''} ${data.creator_last_name || ''}`.trim();
        this.isDeleted = data.is_deleted;
    }
}

class AdminEventAttendeeDTO {
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
    AdminEventDTO,
    AdminEventAttendeeDTO
};