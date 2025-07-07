class EventDTO {
  constructor(eventData) {
    this.id = eventData.id;
    this.start_date = eventData.start_date;
    this.start_time = eventData.start_time;
    this.title = eventData.title;
    this.url = eventData.url;
    this.description = eventData.description;
    this.end_date = eventData.end_date;
    this.end_time = eventData.end_time;
    this.audience_type = eventData.audience_type;
    this.speakers = eventData.speakers;
    this.event_category = eventData.event_category;
    this.event_thumbnail = eventData.event_thumbnail;
    this.online_event = eventData.online_event;
    this.event_venue = eventData.event_venue;
    this.max_limit = eventData.max_limit;
    this.attendees_count = eventData.attendees_count;
    this.creator_name = eventData.creator_name;
    this.creator_role = eventData.creator_role;
    this.registered_at = eventData.registered_at;
    this.is_registered = !!eventData.registered_at;
  }
}

module.exports = EventDTO;