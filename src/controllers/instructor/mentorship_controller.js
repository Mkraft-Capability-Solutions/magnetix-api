// instructor_mentorship_controller.js
const instructorMentorshipService = require('../../services/instructor/mentorship_service');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const Joi = require('joi');

// Validation schemas
const mentorshipRequestSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0)
});

const approveMentorshipSchema = Joi.object({
    mentorshipId: Joi.number().integer().required()
});

const sessionRequestSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0)
});

const approveSessionSchema = Joi.object({
    sessionId: Joi.number().integer().required()
});

const scheduleSessionSchema = Joi.object({
    menteeId: Joi.string().required(),
    sessionDate: Joi.date().required(),
    sessionTime: Joi.string().required(),
    topic: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    url: Joi.string().uri().allow('').optional(),
    duration: Joi.string().default('30 minutes')
});

const updateSessionSchema = Joi.object({
    sessionId: Joi.number().integer().required(),
    sessionDate: Joi.date().required(),
    sessionTime: Joi.string().required(),
    topic: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    url: Joi.string().uri().allow('').optional()
});

exports.getMentorshipRequests = async (req, res, next) => {
    try {
        const { error } = mentorshipRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const requests = await instructorMentorshipService.getMentorshipRequests(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

exports.approveMentorshipRequest = async (req, res, next) => {
    try {
        const { error } = approveMentorshipSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { mentorshipId } = req.body;
        await instructorMentorshipService.approveMentorshipRequest(req.user.uuid, mentorshipId);
        
        res.json({
            success: true,
            message: 'Mentorship request approved successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.rejectMentorshipRequest = async (req, res, next) => {
    try {
        const { error } = approveMentorshipSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { mentorshipId } = req.body;
        await instructorMentorshipService.rejectMentorshipRequest(req.user.uuid, mentorshipId);
        
        res.json({
            success: true,
            message: 'Mentorship request rejected successfully'
        });
    } catch (error) {
        next(error);
    }
};


exports.getAllMentees = async (req, res, next) => {
    try {
        const { error } = mentorshipRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const mentees = await instructorMentorshipService.getAllMentees(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: mentees
        });
    } catch (error) {
        next(error);
    }
};

exports.getScheduleSessionRequests = async (req, res, next) => {
    try {
        const { error } = sessionRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const requests = await instructorMentorshipService.getScheduleSessionRequests(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

exports.approveSessionRequest = async (req, res, next) => {
    try {
        const { error } = approveSessionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { sessionId } = req.body;
        await instructorMentorshipService.approveSessionRequest(req.user.uuid, sessionId);
        
        res.json({
            success: true,
            message: 'Session request approved successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.rejectSessionRequest = async (req, res, next) => {
    try {
        const { error } = approveSessionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { sessionId } = req.body;
        await instructorMentorshipService.rejectSessionRequest(req.user.uuid, sessionId);
        
        res.json({
            success: true,
            message: 'Session request rejected successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.getUpcomingScheduleSessions = async (req, res, next) => {
    try {
        const { error } = sessionRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const sessions = await instructorMentorshipService.getUpcomingScheduleSessions(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

exports.getPastScheduleSessions = async (req, res, next) => {
    try {
        const { error } = sessionRequestSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { limit, offset } = req.query;
        const sessions = await instructorMentorshipService.getPastScheduleSessions(req.user.uuid, limit, offset);
        
        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

exports.scheduleSession = async (req, res, next) => {
    try {
        const { error } = scheduleSessionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const sessionId = await instructorMentorshipService.scheduleSession(req.user.uuid, req.body);
        
        res.status(201).json({
            success: true,
            message: 'Session scheduled successfully',
            sessionId
        });
    } catch (error) {
        next(error);
    }
};

exports.updateScheduledSession = async (req, res, next) => {
    try {
        const { error } = updateSessionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        await instructorMentorshipService.updateScheduledSession(req.user.uuid, req.body.sessionId, req.body);
        
        res.json({
            success: true,
            message: 'Session updated successfully'
        });
    } catch (error) {
        next(error);
    }
};