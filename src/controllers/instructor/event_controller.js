// instructor_event_controller.js
const instructorEventService = require('../../services/instructor/event_service');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const Joi = require('joi');

// Validation schemas
const eventRequestSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0)
});

const createEventSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    startDate: Joi.date().required(),
    startTime: Joi.string().required(),
    endDate: Joi.date().required(),
    endTime: Joi.string().required(),
    eventAudienceTypeId: Joi.number().integer().required(),
    speakers: Joi.string().allow('').optional(),
    eventCategory: Joi.string().allow('').optional(),
    eventThumbnail: Joi.string().allow('').optional(),
    onlineEvent: Joi.boolean().default(false),
    eventVenue: Joi.string().allow('').optional(),
    maxLimit: Joi.number().integer().min(1).required(),
    url: Joi.string().uri().allow('').optional()
});

const updateEventSchema = Joi.object({
    eventId: Joi.number().integer().required(),
    title: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    startDate: Joi.date().required(),
    startTime: Joi.string().required(),
    endDate: Joi.date().required(),
    endTime: Joi.string().required(),
    eventAudienceTypeId: Joi.number().integer().required(),
    speakers: Joi.string().allow('').optional(),
    eventCategory: Joi.string().allow('').optional(),
    eventThumbnail: Joi.string().allow('').optional(),
    onlineEvent: Joi.boolean().default(false),
    eventVenue: Joi.string().allow('').optional(),
    maxLimit: Joi.number().integer().min(1).required(),
    url: Joi.string().uri().allow('').optional()
});

const deleteEventSchema = Joi.object({
    eventId: Joi.number().integer().required()
});

const eventAttendeesSchema = Joi.object({
    eventId: Joi.number().integer().required()
});

exports.createEvent = async (req, res, next) => {
    try {
        const { error } = createEventSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const eventId = await instructorEventService.createEvent(req.user.uuid, req.body);
        
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            eventId
        });
    } catch (error) {
        next(error);
    }
};

exports.updateEvent = async (req, res, next) => {
    try {
        const { error } = updateEventSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        await instructorEventService.updateEvent(req.user.uuid, req.body.eventId, req.body);
        
        res.json({
            success: true,
            message: 'Event updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteEvent = async (req, res, next) => {
    try {
        const { error } = deleteEventSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        await instructorEventService.deleteEvent(req.user.uuid, req.body.eventId);
        
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyUpcomingEvents = async (req, res, next) => {
    try {
        const { error } = eventRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const events = await instructorEventService.getMyUpcomingEvents(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyPastEvents = async (req, res, next) => {
    try {
        const { error } = eventRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const events = await instructorEventService.getMyPastEvents(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        next(error);
    }
};

exports.getEventAttendees = async (req, res, next) => {
    try {
        const { error } = eventAttendeesSchema.validate(req.params);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { eventId } = req.params;
        const attendees = await instructorEventService.getEventAttendees(eventId);
        
        res.json({
            success: true,
            data: attendees
        });
    } catch (error) {
        next(error);
    }
};