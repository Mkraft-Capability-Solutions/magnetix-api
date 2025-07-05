const eventService = require('../../services/student/event_service');

exports.getAllUpcomingEvents = async (req, res, next) => {
  try {
    const events = await eventService.getAllUpcomingEvents(req.user.uuid);
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

exports.getUpcomingRegisteredEvents = async (req, res, next) => {
  try {
    const events = await eventService.getUpcomingRegisteredEvents(req.user.uuid);
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

exports.getPastEvents = async (req, res, next) => {
  try {
    const events = await eventService.getPastEvents(req.user.uuid);
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

exports.registerForEvent = async (req, res, next) => {
  try {
    await eventService.registerForEvent(req.user.uuid, req.params.eventId);
    res.json({
      success: true,
      message: 'Successfully registered for the event'
    });
  } catch (error) {
    next(error);
  }
};