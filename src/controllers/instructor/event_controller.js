const InstructorEventService = require('../../services/instructor/event_service');
const { eventIdSchema } = require('../../dto/instructor/event_dto');

exports.createEvent = async (req, res, next) => {
  try {
    const creatorId = req.user.uuid;
    await InstructorEventService.createEvent(creatorId, req.body);
    res.json({ success: true, message: 'Event created successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const creatorId = req.user.uuid;
    await InstructorEventService.updateEvent(creatorId, req.body);
    res.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const { error } = eventIdSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const creatorId = req.user.uuid;
    await InstructorEventService.deleteEvent(creatorId, req.body.event_id);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getMyUpcomingEvents = async (req, res, next) => {
  try {
    const creatorId = req.user.uuid;
    const events = await InstructorEventService.getMyUpcomingEvents(creatorId);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

exports.getMyPastEvents = async (req, res, next) => {
  try {
    const creatorId = req.user.uuid;
    const events = await InstructorEventService.getMyPastEvents(creatorId);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

exports.getEventAttendees = async (req, res, next) => {
  try {
    const { error } = eventIdSchema.validate(req.params);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const creatorId = req.user.uuid;
    const attendees = await InstructorEventService.getEventAttendees(creatorId, req.params.event_id);
    res.json({ success: true, data: attendees });
  } catch (error) {
    next(error);
  }
};