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
    ).optional(),
    target_audience_emails: Joi.string().allow('').optional()
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

const bulkEnrollSchema = Joi.object({
    eventId: Joi.number().integer().required(),
    emails: Joi.array().items(Joi.string().email()).min(1).required()
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
            url: req.body.url || '',
            target_audience_emails: req.body.target_audience_emails || ''
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

// Bulk enroll students in an event
exports.bulkEnrollStudents = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        // Validate request body
        const { error } = bulkEnrollSchema.validate({ eventId, ...req.body });
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { emails } = req.body;

        // Check if event exists
        const event = await adminEventService.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Process bulk enrollment
        const result = await adminEventService.bulkEnrollStudents(eventId, emails);

        res.json({
            success: true,
            message: `Bulk enrollment completed. ${result.enrolled} students enrolled, ${result.skipped} skipped.`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Upload attendance file for an event
exports.uploadAttendanceFile = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Check if event exists
        const event = await adminEventService.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if there's an existing file and delete it
        const existingFilename = await adminEventService.getAttendanceFileInfo(eventId);
        if (existingFilename) {
            const existingFilePath = uploadService.getAttendanceFilePath(existingFilename);
            const fs = require('fs');

            try {
                if (fs.existsSync(existingFilePath)) {
                    fs.unlinkSync(existingFilePath);
                    console.log(`Deleted old attendance file: ${existingFilePath}`);
                }
            } catch (fileError) {
                console.error('Error deleting old file:', fileError);
                // Continue with upload even if old file deletion fails
            }
        }

        // Upload the attendance file
        const filename = await uploadService.uploadEventAttendanceFile(req.file, eventId);

        res.json({
            success: true,
            message: 'Attendance file uploaded successfully',
            data: {
                eventId: eventId,
                attendanceFile: filename
            }
        });
    } catch (error) {
        next(error);
    }
};

// Download attendance file for an event
exports.downloadAttendanceFile = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        // Get attendance file info
        const filename = await adminEventService.getAttendanceFileInfo(eventId);
        if (!filename) {
            return res.status(404).json({ message: 'No attendance file found for this event' });
        }

        // Get file path
        const filePath = uploadService.getAttendanceFilePath(filename);
        const fs = require('fs');
        const path = require('path');

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Attendance file not found on server' });
        }

        // Get file extension to set proper content type
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';

        switch (ext) {
            case '.pdf':
                contentType = 'application/pdf';
                break;
            case '.docx':
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
            case '.xlsx':
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                break;
        }

        // Set appropriate headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        // Send file
        res.sendFile(path.resolve(filePath));
    } catch (error) {
        next(error);
    }
};

// Remove attendance file from an event
exports.removeAttendanceFile = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }

        // Check if event exists
        const event = await adminEventService.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Get current attendance file info before removing
        const filename = await adminEventService.getAttendanceFileInfo(eventId);
        console.log(`Attempting to remove attendance file for event ${eventId}, filename: ${filename}`);

        if (filename) {
            // Delete physical file from server
            const filePath = uploadService.getAttendanceFilePath(filename);
            console.log(`Constructed file path: ${filePath}`);
            const fs = require('fs');

            try {
                console.log(`Checking if file exists: ${filePath}`);
                if (fs.existsSync(filePath)) {
                    console.log(`File exists, attempting to delete: ${filePath}`);
                    fs.unlinkSync(filePath);
                    console.log(`Successfully deleted attendance file: ${filePath}`);
                } else {
                    console.log(`File does not exist at path: ${filePath}`);
                }
            } catch (fileError) {
                console.error('Error deleting physical file:', fileError);
                console.error('File path that failed:', filePath);
                // Continue with database removal even if file deletion fails
            }
        } else {
            console.log(`No filename found for event ${eventId}, skipping file deletion`);
        }

        // Remove attendance file reference from database
        await adminEventService.removeAttendanceFile(eventId);

        res.json({
            success: true,
            message: 'Attendance file removed successfully'
        });
    } catch (error) {
        next(error);
    }
};