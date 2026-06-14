const Joi = require("joi");
const AppError = require("../utils/appError");

// ============================================================================
// SCHEMAS
// ============================================================================

const addSectionSchema = Joi.object({
  title: Joi.string().trim().min(1).required().messages({
    "string.empty": "Section title is required",
    "any.required": "Section title is required",
  }),
}).options({ abortEarly: false, stripUnknown: true });

const updateSectionSchema = Joi.object({
  title: Joi.string().trim().min(1).required().messages({
    "string.empty": "Section title is required",
    "any.required": "Section title is required",
  }),
}).options({ abortEarly: false, stripUnknown: true });

const addLessonSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  sectionId: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string())
    .required()
    .messages({ "any.required": "sectionId is required" }),
  lessonType: Joi.string().valid("ILTS", "Content-Based").required(),
  lessonOrder: Joi.number().integer().optional().allow(null),
  skills: Joi.array().items(Joi.string()).optional().default([]),
  description: Joi.string().allow("").optional(),

  // Content-Based fields
  contentType: Joi.string()
    .valid("document", "scorm", "mp4", "url", "quiz")
    .optional(),
  lessonContentDocument: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.object().unknown(true), Joi.allow(null))
    .optional(),
  scormPackage: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.object().unknown(true), Joi.allow(null))
    .optional(),
  videoUpload: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.object().unknown(true), Joi.allow(null))
    .optional(),
  contentUrl: Joi.string().allow("").optional(),
  lessonDuration: Joi.string().allow("").optional(),
  duration: Joi.string().allow("").optional(),

  // Assessment fields
  assessmentId: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string())
    .optional()
    .allow(null),
  requireSectionCompletion: Joi.boolean().optional().default(false),
  assessmentStartDate: Joi.string().allow("", null).optional(),
  assessmentEndDate: Joi.string().allow("", null).optional(),

  // ILTS fields
  iltsType: Joi.string().valid("Online", "Offline").optional(),
  meetingUrl: Joi.string().allow("").optional(),
  venue: Joi.string().allow("").optional(),
  startDate: Joi.string().allow("").optional(),
  startTime: Joi.string().allow("").optional(),
  endDate: Joi.string().allow("").optional(),
  endTime: Joi.string().allow("").optional(),
  eventVenue: Joi.string().allow("").optional(),
  meetUrl: Joi.string().allow("").optional(),
  file: Joi.any().optional(),
  url: Joi.string().allow("").optional(),
}).options({ abortEarly: false, stripUnknown: true });

const updateLessonSchema = addLessonSchema.keys({
  id: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .optional()
    .allow(null),
  sectionId: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string())
    .optional(),
  lessonType: Joi.string().valid("ILTS", "Content-Based").optional(),
  title: Joi.string().trim().min(1).optional(),
}).options({ abortEarly: false, stripUnknown: true });

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    throw new AppError("Validation failed", 400, errors);
  }
  req.body = value;
  next();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  validateAddSection: validate(addSectionSchema),
  validateUpdateSection: validate(updateSectionSchema),
  validateAddLesson: validate(addLessonSchema),
  validateUpdateLesson: validate(updateLessonSchema),
};
