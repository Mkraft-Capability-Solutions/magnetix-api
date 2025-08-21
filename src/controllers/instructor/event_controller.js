// instructor_event_controller.js
const instructorEventService = require('../../services/instructor/event_service');
const uploadService = require('../../services/upload_service');
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
    eventThumbnail: Joi.string().allow('', null).optional(),
    onlineEvent: Joi.boolean().default(false),
    eventVenue: Joi.string().allow('', null).optional(),
    maxLimit: Joi.number().integer().min(1).required(),
    url: Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().allow('', null)
    ).optional(),
    target_audience_emails: Joi.string().allow('').optional()
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
    eventThumbnail: Joi.string().allow('', null).optional(),
    onlineEvent: Joi.boolean().default(false),
    eventVenue: Joi.string().allow('', null).optional(),
    maxLimit: Joi.number().integer().min(1).required(),
    url: Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().allow('', null)
    ).optional(),
    target_audience_emails: Joi.string().allow('').optional()
});

const deleteEventSchema = Joi.object({
    eventId: Joi.number().integer().required()
});

const eventAttendeesSchema = Joi.object({
    eventId: Joi.number().integer().required()
});

exports.createEvent = async (req, res, next) => {
    try {
        // Process FormData and convert string values to appropriate types
        console.log('Raw request body:', req.body);
        const isOnline = req.body.onlineEvent === 'true';
        const processedData = {
            title: req.body.title,
            description: req.body.description || '',
            startDate: new Date(req.body.startDate),
            startTime: req.body.startTime,
            endDate: new Date(req.body.endDate),
            endTime: req.body.endTime,
            eventAudienceTypeId: parseInt(req.body.eventAudienceTypeId),
            speakers: req.body.speakers || '',
            eventCategory: req.body.eventCategory || '',
            eventThumbnail: req.body.eventThumbnail || '',
            onlineEvent: isOnline,
            eventVenue: isOnline ? null : (req.body.eventVenue || ''),
            maxLimit: parseInt(req.body.maxLimit),
            url: req.body.url || '',
            target_audience_emails: req.body.target_audience_emails || ''
        };

        console.log('Processed eventThumbnail:', processedData.eventThumbnail);

        console.log('Data being validated:', processedData);
        const { error } = createEventSchema.validate(processedData);
        if (error) {
            console.error('Validation error:', error.details);
            return res.status(400).json({ 
                message: error.details[0].message,
                field: error.details[0].path.join('.'),
                value: error.details[0].context?.value
            });
        }

        const eventId = await instructorEventService.createEvent(req.user.uuid, processedData);
        
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: {
                eventId: eventId,
                eventThumbnail: processedData.eventThumbnail
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getEventById = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        const event = await instructorEventService.getEventById(req.user.uuid, eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        next(error);
    }
};

exports.updateEvent = async (req, res, next) => {
    try {
        // Process FormData and convert string values to appropriate types
        console.log('Raw request body for update:', req.body);
        const isOnline = req.body.onlineEvent === 'true';
        const processedData = {
            eventId: parseInt(req.body.eventId),
            title: req.body.title,
            description: req.body.description || '',
            startDate: new Date(req.body.startDate),
            startTime: req.body.startTime,
            endDate: new Date(req.body.endDate),
            endTime: req.body.endTime,
            eventAudienceTypeId: parseInt(req.body.eventAudienceTypeId),
            speakers: req.body.speakers || '',
            eventCategory: req.body.eventCategory || '',
            eventThumbnail: req.body.eventThumbnail || req.body.existingThumbnail || '',
            onlineEvent: isOnline,
            eventVenue: isOnline ? null : (req.body.eventVenue || ''),
            maxLimit: parseInt(req.body.maxLimit),
            url: req.body.url || '',
            target_audience_emails: req.body.target_audience_emails || ''
        };

        console.log('Processed eventThumbnail for update:', processedData.eventThumbnail);

        const { error } = updateEventSchema.validate(processedData);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        await instructorEventService.updateEvent(req.user.uuid, processedData.eventId, processedData);
        
        // Handle individual target audience emails if provided and audience type is individual
        if (processedData.eventAudienceTypeId === 1 && processedData.target_audience_emails) {
            // Clear existing target audience attendees and add new ones
            await instructorEventService.updateTargetAudienceAttendees(processedData.eventId, processedData.target_audience_emails);
        }
        
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