const adminEventService = require('../../services/admin/event_service');
const uploadService = require('../../services/upload_service');
const Joi = require('joi');

// Validation schemas
const eventRequestSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0)
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
    ).optional()
});

const deleteEventSchema = Joi.object({
    eventId: Joi.number().integer().required()
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

const eventAttendeesSchema = Joi.object({
    eventId: Joi.number().integer().required()
});

// Create new event (admin can create events)
exports.createEvent = async (req, res, next) => {
    try {
        // Handle file upload first if present
        let eventThumbnailFilename = '';
        if (req.file) {
            console.log('Admin file received:', req.file);
            eventThumbnailFilename = await uploadService.uploadEventThumbnail(req.file, null);
            console.log('Admin uploaded thumbnail filename:', eventThumbnailFilename);
        } else {
            console.log('No file received in admin request');
        }

        // Process FormData and convert string values to appropriate types
        console.log('Admin raw request body:', req.body);
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
            eventThumbnail: eventThumbnailFilename || '',
            onlineEvent: isOnline,
            eventVenue: isOnline ? null : (req.body.eventVenue || ''),
            maxLimit: parseInt(req.body.maxLimit),
            url: req.body.url || '',
            target_audience_emails: req.body.target_audience_emails || ''
        };

        console.log('Admin processed eventThumbnail:', processedData.eventThumbnail);
        console.log('Admin data being validated:', processedData);
        
        const { error } = createEventSchema.validate(processedData);
        if (error) {
            console.error('Admin validation error:', error.details);
            return res.status(400).json({ 
                message: error.details[0].message,
                field: error.details[0].path.join('.'),
                value: error.details[0].context?.value
            });
        }

        const eventId = await adminEventService.createEvent(req.user.uuid, processedData);
        
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

// Get all upcoming events created by other users
exports.getAllUpcomingEvents = async (req, res, next) => {
    try {
        const { error } = eventRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const events = await adminEventService.getAllUpcomingEvents(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        next(error);
    }
};

// Get all past events created by other users
exports.getAllPastEvents = async (req, res, next) => {
    try {
        const { error } = eventRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const events = await adminEventService.getAllPastEvents(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        next(error);
    }
};

// Get admin's own upcoming events
exports.getMyUpcomingEvents = async (req, res, next) => {
    try {
        const { error } = eventRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const events = await adminEventService.getMyUpcomingEvents(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        next(error);
    }
};

// Get admin's own past events
exports.getMyPastEvents = async (req, res, next) => {
    try {
        const { error } = eventRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const events = await adminEventService.getMyPastEvents(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        next(error);
    }
};

// Update any event (admin can update any event)
exports.updateEvent = async (req, res, next) => {
    try {
        // Handle file upload first if present
        let eventThumbnailFilename = '';
        if (req.file) {
            console.log('Admin update file received:', req.file);
            eventThumbnailFilename = await uploadService.uploadEventThumbnail(req.file, null);
            console.log('Admin update uploaded thumbnail filename:', eventThumbnailFilename);
        } else {
            console.log('No file received in admin update request');
        }

        // Process FormData and convert string values to appropriate types
        console.log('Raw request body for admin update:', req.body);
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
            eventThumbnail: eventThumbnailFilename || req.body.existingThumbnail || '',
            onlineEvent: isOnline,
            eventVenue: isOnline ? null : (req.body.eventVenue || ''),
            maxLimit: parseInt(req.body.maxLimit),
            url: req.body.url || ''
        };

        console.log('Processed data for admin update:', processedData);
        console.log('Admin update processed eventThumbnail:', processedData.eventThumbnail);

        const { error } = updateEventSchema.validate(processedData);
        if (error) {
            console.error('Admin update validation error:', error.details);
            return res.status(400).json({ 
                message: error.details[0].message,
                field: error.details[0].path.join('.'),
                value: error.details[0].context?.value
            });
        }

        await adminEventService.updateEvent(processedData.eventId, processedData);
        
        // Handle individual target audience emails if provided and audience type is individual
        if (processedData.eventAudienceTypeId === 1 && req.body.target_audience_emails) {
            // Clear existing target audience attendees and add new ones
            await adminEventService.updateTargetAudienceAttendees(processedData.eventId, req.body.target_audience_emails);
        }
        
        res.json({
            success: true,
            message: 'Event updated successfully',
            data: {
                eventId: processedData.eventId,
                eventThumbnail: processedData.eventThumbnail
            }
        });
    } catch (error) {
        next(error);
    }
};

// Delete any event (admin can delete any event)
exports.deleteEvent = async (req, res, next) => {
    try {
        const { error } = deleteEventSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        await adminEventService.deleteEvent(req.body.eventId);
        
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get event by ID (for any event)
exports.getEventById = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        const event = await adminEventService.getEventById(eventId);
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

// Get event attendees (for any event)
exports.getEventAttendees = async (req, res, next) => {
    try {
        const { error } = eventAttendeesSchema.validate(req.params);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { eventId } = req.params;
        const attendees = await adminEventService.getEventAttendees(eventId);
        
        res.json({
            success: true,
            data: attendees
        });
    } catch (error) {
        next(error);
    }
};