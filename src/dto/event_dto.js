class EventDTO {
  constructor(eventData) {
    this.id = eventData.id;
    this.startDate = eventData.start_date;
    this.startTime = eventData.start_time;
    this.title = eventData.title;
    this.url = eventData.url;
    this.description = eventData.description;
    this.endDate = eventData.end_date;
    this.endTime = eventData.end_time;
    this.eventAudienceTypeId = eventData.event_audience_type_id;
    this.speakers = eventData.speakers ? eventData.speakers.split(',') : [];
    this.eventCategory = eventData.event_category;
    this.eventThumbnail = eventData.event_thumbnail;
    this.onlineEvent = Boolean(eventData.online_event);
    this.eventVenue = eventData.event_venue;
    this.maxLimit = eventData.max_limit;
    this.attendeesCount = eventData.attendees_count;
    this.creatorId = eventData.creator_id;
    this.createdDate = eventData.created_date;
    this.lastUpdated = eventData.last_updated;
    
    // Additional fields
    this.organizerName = eventData.organizer_name;
    this.audienceType = eventData.audience_type;
    this.isRegistered = eventData.is_registered || false;
    this.registeredAt = eventData.registered_at || null;
  }
}

class EventAttendeeDTO {
  constructor(attendeeData) {
    this.id = attendeeData.id;
    this.eventId = attendeeData.event_id;
    this.recipientId = attendeeData.recipient_id;
    this.recipientName = attendeeData.recipient_name;
    this.recipientEmail = attendeeData.recipient_email;
    this.registeredAt = attendeeData.registered_at;
    
    // Additional fields
    this.eventTitle = attendeeData.event_title;
    this.eventThumbnail = attendeeData.event_thumbnail;
  }
}

class EventCategoryDTO {
  constructor(categoryData) {
    this.id = categoryData.id;
    this.name = categoryData.name;
    this.description = categoryData.description;
  }
}

module.exports = {
  EventDTO,
  EventAttendeeDTO,
  EventCategoryDTO
};