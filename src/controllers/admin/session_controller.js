// admin_session_controller.js
const adminSessionService = require('../../services/admin/session_service');
const Joi = require('joi');

// Validation schemas
const scheduleSessionSchema = Joi.object({
    instructorId: Joi.string().required(),
    menteeId: Joi.string().required(),
    sessionDate: Joi.date().required(),
    sessionTime: Joi.string().required(),
    topic: Joi.string().min(5).required(),
    description: Joi.string().allow('').optional(),
    url: Joi.string().uri().optional(), // Optional - will be auto-generated if not provided
    duration: Joi.string().default('30 minutes')
});

const updateSessionSchema = Joi.object({
    sessionId: Joi.number().integer().required(),
    instructorId: Joi.string().optional(),
    menteeId: Joi.string().optional(),
    sessionDate: Joi.date().optional(),
    sessionTime: Joi.string().optional(),
    topic: Joi.string().min(5).optional(),
    description: Joi.string().allow('').optional(),
    url: Joi.string().uri().optional(),
    duration: Joi.string().optional()
});

const deleteSessionSchema = Joi.object({
    sessionId: Joi.number().integer().required()
});

const getAllSessionsSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    status: Joi.string().valid('pending', 'booked', 'cancelled', 'rejected').optional(),
    instructorId: Joi.string().optional(),
    menteeId: Joi.string().optional()
});

// Schedule a new session between instructor and student
exports.scheduleSession = async (req, res, next) => {
    try {
        const { error } = scheduleSessionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const sessionData = {
            ...req.body,
            createdBy: req.user.uuid, // Admin who created the session
            createdByRole: 'admin'
        };

        const result = await adminSessionService.scheduleSession(sessionData);

        res.status(201).json({
            success: true,
            message: 'Session scheduled successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in scheduleSession controller:', error);

        // Return detailed error message to frontend
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to schedule session'
        });
    }
};

// Update an existing session
exports.updateSession = async (req, res, next) => {
    try {
        const { error } = updateSessionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { sessionId, ...updateData } = req.body;
        const result = await adminSessionService.updateSession(sessionId, updateData, req.user.uuid);

        res.json({
            success: true,
            message: 'Session updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in updateSession controller:', error);
        next(error);
    }
};

// Delete/Cancel a session
exports.deleteSession = async (req, res, next) => {
    try {
        const { error } = deleteSessionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { sessionId } = req.body;
        await adminSessionService.deleteSession(sessionId, req.user.uuid);

        res.json({
            success: true,
            message: 'Session cancelled successfully'
        });
    } catch (error) {
        console.error('Error in deleteSession controller:', error);
        next(error);
    }
};

// Get all scheduled sessions with filters
exports.getAllSessions = async (req, res, next) => {
    try {
        const { error } = getAllSessionsSchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { limit, offset, status, instructorId, menteeId } = req.query;
        const filters = {};

        if (status) filters.status = status;
        if (instructorId) filters.instructorId = instructorId;
        if (menteeId) filters.menteeId = menteeId;

        const sessions = await adminSessionService.getAllSessions(limit, offset, filters);

        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Error in getAllSessions controller:', error);
        next(error);
    }
};

// Get a specific session by ID
exports.getSessionById = async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);

        if (isNaN(sessionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid session ID'
            });
        }

        const session = await adminSessionService.getSessionById(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Error in getSessionById controller:', error);
        next(error);
    }
};

// Get session statistics
exports.getSessionStats = async (req, res, next) => {
    try {
        const stats = await adminSessionService.getSessionStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error in getSessionStats controller:', error);
        next(error);
    }
};

// Get available instructors for a specific date and time
exports.getAvailableInstructors = async (req, res, next) => {
    try {
        const { sessionDate, sessionTime } = req.query;

        // Validate date and time format if provided
        if (sessionDate && !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        if (sessionTime && !/^\d{2}:\d{2}$/.test(sessionTime)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format. Use HH:mm'
            });
        }

        const instructors = await adminSessionService.getAvailableInstructors(
            sessionDate,
            sessionTime
        );

        res.json({
            success: true,
            message: sessionDate && sessionTime
                ? `Found ${instructors.length} available instructor(s) for ${sessionDate} at ${sessionTime}`
                : `Found ${instructors.length} active instructor(s)`,
            data: instructors
        });
    } catch (error) {
        console.error('Error in getAvailableInstructors controller:', error);
        next(error);
    }
};

// Get all instructors with their availability info
exports.getAllInstructors = async (req, res, next) => {
    try {
        const instructors = await adminSessionService.getAllInstructors();

        res.json({
            success: true,
            data: instructors
        });
    } catch (error) {
        console.error('Error in getAllInstructors controller:', error);
        next(error);
    }
};
