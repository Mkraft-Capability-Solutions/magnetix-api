const Joi = require("joi");

const createApiKeySchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
  allowed_routes: Joi.array()
    .items(Joi.string().trim().min(1).max(200))
    .min(1)
    .required(),
  expires_at: Joi.date().iso().greater("now").optional().allow(null),
});

const updateApiKeySchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional(),
  allowed_routes: Joi.array()
    .items(Joi.string().trim().min(1).max(200))
    .min(1)
    .optional(),
  expires_at: Joi.date().iso().greater("now").optional().allow(null),
}).min(1);

module.exports = {
  createApiKeySchema,
  updateApiKeySchema,
};
