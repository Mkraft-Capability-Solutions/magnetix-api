const adminSessionService = require('../../services/admin/session_service');
const Joi = require('joi');

// Validation schemas
const getPaginatedSessionsSchema = Joi.object({
    status: Joi.string().valid('pending', 'booked', 'cancelled', 'rejected').optional(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0)
});

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
    duration: Joi.string().optional(),
    status: Joi.string().valid('pending', 'booked', 'cancelled', 'rejected').optional()
});

const sessionIdSchema = Joi.object({
    sessionId: Joi.number().integer().required()
});

// Get all sessions with optional status filter and pagination
exports.getAllSessions = async (req, res, next) => {
    try {
        const { error } = getPaginatedSessionsSchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { status, limit, offset } = req.query;
        const result = await adminSessionService.getAllSessions({ status, limit, offset });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Get pending sessions
exports.getPendingSessions = async (req, res, next) => {
    try {
        const { error } = Joi.object({
            limit: Joi.number().integer().min(1).max(100).default(10),
            offset: Joi.number().integer().min(0).default(0)
        }).validate(req.query);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { limit, offset } = req.query;
        const result = await adminSessionService.getSessionsByStatus('pending', limit, offset);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Get booked sessions
exports.getBookedSessions = async (req, res, next) => {
    try {
        const { error } = Joi.object({
            limit: Joi.number().integer().min(1).max(100).default(10),
            offset: Joi.number().integer().min(0).default(0)
        }).validate(req.query);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { limit, offset } = req.query;
        const result = await adminSessionService.getSessionsByStatus('booked', limit, offset);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Get rejected sessions
exports.getRejectedSessions = async (req, res, next) => {
    try {
        const { error } = Joi.object({
            limit: Joi.number().integer().min(1).max(100).default(10),
            offset: Joi.number().integer().min(0).default(0)
        }).validate(req.query);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { limit, offset } = req.query;
        const result = await adminSessionService.getSessionsByStatus('rejected', limit, offset);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Get cancelled sessions
exports.getCancelledSessions = async (req, res, next) => {
    try {
        const { error } = Joi.object({
            limit: Joi.number().integer().min(1).max(100).default(10),
            offset: Joi.number().integer().min(0).default(0)
        }).validate(req.query);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { limit, offset } = req.query;
        const result = await adminSessionService.getSessionsByStatus('cancelled', limit, offset);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Get past sessions (completed sessions based on date + duration)
exports.getPastSessions = async (req, res, next) => {
    try {
        const { error } = Joi.object({
            limit: Joi.number().integer().min(1).max(100).default(10),
            offset: Joi.number().integer().min(0).default(0)
        }).validate(req.query);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { limit, offset } = req.query;
        const result = await adminSessionService.getPastSessions(limit, offset);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Get session by ID
exports.getSessionById = async (req, res, next) => {
    try {
        const { error } = sessionIdSchema.validate({ sessionId: req.params.sessionId });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const session = await adminSessionService.getSessionById(req.params.sessionId);

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
        next(error);
    }
};

// Schedule a new session
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
            createdBy: req.user.uuid // Admin who created the session
        };

        const result = await adminSessionService.scheduleSession(sessionData);

        res.status(201).json({
            success: true,
            message: 'Session scheduled successfully',
            data: result
        });
    } catch (error) {
        next(error);
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

        // Check if session is in the past
        const session = await adminSessionService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if session is past
        const isPast = await adminSessionService.isSessionPast(session);
        if (isPast) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update past sessions'
            });
        }

        updateData.updatedBy = req.user.uuid; // Admin who updated the session

        const result = await adminSessionService.updateSession(sessionId, updateData);

        res.json({
            success: true,
            message: 'Session updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Cancel a session
exports.cancelSession = async (req, res, next) => {
    try {
        const { error } = sessionIdSchema.validate({ sessionId: req.params.sessionId });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        // Check if session is in the past
        const session = await adminSessionService.getSessionById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        const isPast = await adminSessionService.isSessionPast(session);
        if (isPast) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel past sessions'
            });
        }

        await adminSessionService.cancelSession(req.params.sessionId, req.user.uuid);

        res.json({
            success: true,
            message: 'Session cancelled successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Delete a session (soft delete)
exports.deleteSession = async (req, res, next) => {
    try {
        const { error } = sessionIdSchema.validate({ sessionId: req.params.sessionId });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        await adminSessionService.deleteSession(req.params.sessionId);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
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
        next(error);
    }
};

// Get available instructors for a specific date/time
exports.getAvailableInstructors = async (req, res, next) => {
    try {
        const { date, time } = req.query;

        if (!date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Date and time are required'
            });
        }

        const instructors = await adminSessionService.getAvailableInstructors(date, time);

        res.json({
            success: true,
            data: instructors
        });
    } catch (error) {
        next(error);
    }
};

// Get all instructors with availability info
exports.getAllInstructors = async (req, res, next) => {
    try {
        const instructors = await adminSessionService.getAllInstructors();

        res.json({
            success: true,
            data: instructors
        });
    } catch (error) {
        next(error);
    }
};
