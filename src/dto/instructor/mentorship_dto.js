const Joi = require('joi');

const mentorshipRequestSchema = Joi.object({
  mentorship_id: Joi.number().integer().required()
});

const sessionRequestSchema = Joi.object({
  session_id: Joi.number().integer().required()
});

const scheduleSessionSchema = Joi.object({
  mentee_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  session_date: Joi.date().required(),
  session_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration: Joi.number().integer().min(15).max(240).required(),
  session_type: Joi.string().valid('online', 'offline').required(),
  meeting_link: Joi.string().uri().when('session_type', { is: 'online', then: Joi.required(), otherwise: Joi.allow(null) }),
  meeting_address: Joi.string().when('session_type', { is: 'offline', then: Joi.required(), otherwise: Joi.allow(null) })
});

const updateSessionSchema = Joi.object({
  session_id: Joi.number().integer().required(),
  session_date: Joi.date().required(),
  session_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration: Joi.number().integer().min(15).max(240).required(),
  session_type: Joi.string().valid('online', 'offline').required(),
  meeting_link: Joi.string().uri().when('session_type', { is: 'online', then: Joi.required(), otherwise: Joi.allow(null) }),
  meeting_address: Joi.string().when('session_type', { is: 'offline', then: Joi.required(), otherwise: Joi.allow(null) })
});

module.exports = {
  mentorshipRequestSchema,
  sessionRequestSchema,
  scheduleSessionSchema,
  updateSessionSchema
};