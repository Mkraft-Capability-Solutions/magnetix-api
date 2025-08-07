const Joi = require('joi');

const eventSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().allow('').optional(),
  event_date: Joi.date().required(),
  event_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration: Joi.number().integer().min(15).max(240).required(),
  event_type: Joi.string().valid('online', 'offline').required(),
  meeting_link: Joi.string().uri().when('event_type', { is: 'online', then: Joi.required(), otherwise: Joi.allow(null) }),
  meeting_address: Joi.string().when('event_type', { is: 'offline', then: Joi.required(), otherwise: Joi.allow(null) }),
  max_attendees: Joi.number().integer().min(1).required()
});

const eventIdSchema = Joi.object({
  event_id: Joi.number().integer().required()
});

module.exports = {
  eventSchema,
  eventIdSchema
};