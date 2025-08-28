const eventService = require('../../services/student/event_service');
const emailHelper = require('../../utils/email_helper');

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
    const { event_id } = req.body;
    if (!event_id) {
      return res.status(400).json({ success: false, error: { status: 400, message: 'Event ID is required' } });
    }

    const response = await eventService.registerForEvent(req.user.uuid, event_id);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    // Send registration confirmation email
    try {
      if (response.data.user && response.data.event) {
        await emailHelper.sendEventRegistrationEmail(
          response.data.user.email,
          response.data.user.first_name,
          response.data.event
        );
        console.log(`Event registration email sent to ${response.data.user.email} for event: ${response.data.event.title}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the registration
      console.error('Failed to send event registration email:', emailError);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};