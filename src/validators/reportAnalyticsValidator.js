const Joi = require("joi");
const AppError = require("../utils/appError");

const generateReportSchema = Joi.object({
  reportType: Joi.string()
    .valid("user", "course-completion", "learning-engagement", "skills-assessment")
    .required()
    .messages({
      "any.required": "Report type is required",
      "any.only": "Invalid report type. Must be one of: user, course-completion, learning-engagement, skills-assessment",
    }),
  format: Joi.string()
    .valid("pdf", "excel", "csv")
    .required()
    .messages({
      "any.required": "Format is required (pdf, excel, or csv)",
      "any.only": "Invalid format. Must be one of: pdf, excel, csv",
    }),
  dateRange: Joi.object({
    from: Joi.string().allow(null, "").optional(),
    to: Joi.string().allow(null, "").optional(),
  }).optional().allow(null),
  department: Joi.string().allow(null, "").optional(),
}).options({ abortEarly: false, stripUnknown: true });

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return next(new AppError("Validation failed", 400, errors));
  }
  req.body = value;
  next();
};

module.exports = {
  validateGenerateReport: validate(generateReportSchema),
};
