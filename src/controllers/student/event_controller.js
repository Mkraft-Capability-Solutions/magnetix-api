const eventService = require('../../services/student/event_service');

exports.getAllUpcomingEvents = async (req, res, next) => {
  try {
    const response = await eventService.getAllUpcomingEvents(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getUpcomingRegisteredEvents = async (req, res, next) => {
  try {
    const response = await eventService.getUpcomingRegisteredEvents(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getPastEvents = async (req, res, next) => {
  try {
    const response = await eventService.getPastEvents(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.registerForEvent = async (req, res, next) => {
  try {
    const response = await eventService.registerForEvent(req.user.uuid, req.params.eventId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};