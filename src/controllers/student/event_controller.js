const eventService = require('../../services/student/event_service');

// Get all upcoming events not registered by student
exports.getAllUpcomingEvents = async (req, res, next) => {
  try {
    const events = await eventService.getAllUpcomingEvents(req.user.uuid);
    res.json(events);
  } catch (error) {
    next(error);
  }
};

// Get upcoming events student is registered for
exports.getUpcomingRegisteredEvents = async (req, res, next) => {
  try {
    const events = await eventService.getUpcomingRegisteredEvents(req.user.uuid);
    res.json(events);
  } catch (error) {
    next(error);
  }
};

// Get past events student participated in
exports.getPastEvents = async (req, res, next) => {
  try {
    const events = await eventService.getPastEvents(req.user.uuid);
    res.json(events);
  } catch (error) {
    next(error);
  }
};

// Register for an event
exports.registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    await eventService.registerForEvent(req.user.uuid, eventId);
    res.json({ success: true, message: 'Registered for event successfully' });
  } catch (error) {
    next(error);
  }
};