const Joi = require("joi");
const AppError = require("../utils/appError");

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

const filterSchema = Joi.object({
  field: Joi.string().required(),
  operator: Joi.string()
    .valid("equals", "contains", "startsWith", "greaterThan", "lessThan", "between", "in")
    .required(),
  value: Joi.alternatives()
    .try(Joi.string(), Joi.number(), Joi.array().items(Joi.string()))
    .required(),
  valueTo: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .optional()
    .allow(null),
});

// ============================================================================
// ENDPOINT SCHEMAS
// ============================================================================

const previewReportSchema = Joi.object({
  dataSource: Joi.string().required().messages({
    "any.required": "Data source is required",
  }),
  fields: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one field must be selected",
    "any.required": "At least one field must be selected",
  }),
  filters: Joi.array().items(filterSchema).optional().default([]),
  groupBy: Joi.string().optional().allow(null),
  sortBy: Joi.string().optional().allow(null),
  sortOrder: Joi.string().valid("asc", "desc").optional().default("asc"),
  limit: Joi.number().integer().min(1).max(1000).optional().default(50),
  offset: Joi.number().integer().min(0).optional().default(0),
}).options({ abortEarly: false, stripUnknown: true });

const exportReportSchema = Joi.object({
  dataSource: Joi.string().required().messages({
    "any.required": "Data source is required",
  }),
  fields: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one field must be selected",
    "any.required": "At least one field must be selected",
  }),
  filters: Joi.array().items(filterSchema).optional().default([]),
  groupBy: Joi.string().optional().allow(null),
  sortBy: Joi.string().optional().allow(null),
  sortOrder: Joi.string().valid("asc", "desc").optional().default("asc"),
  format: Joi.string().valid("pdf", "excel", "csv").optional().default("pdf"),
  reportName: Joi.string().optional().allow(null, ""),
}).options({ abortEarly: false, stripUnknown: true });

const aggregateReportSchema = Joi.object({
  dataSource: Joi.string().required().messages({
    "any.required": "Data source is required",
  }),
  groupByField: Joi.string().required().messages({
    "any.required": "Group by field is required",
  }),
  aggregateField: Joi.string().optional().allow(null),
  aggregateFunction: Joi.string()
    .valid("count", "sum", "avg", "min", "max")
    .optional()
    .default("count"),
  filters: Joi.array().items(filterSchema).optional().default([]),
  limit: Joi.number().integer().min(1).max(50).optional().default(10),
}).options({ abortEarly: false, stripUnknown: true });

const aiGenerateConfigSchema = Joi.object({
  prompt: Joi.string().trim().min(5).max(1000).required().messages({
    "string.min": "Please provide a report description (at least 5 characters)",
    "string.max": "Description is too long (max 1000 characters)",
    "any.required": "Please provide a report description",
  }),
}).options({ abortEarly: false, stripUnknown: true });

const aiInsightsSchema = Joi.object({
  dataSource: Joi.string().required().messages({
    "any.required": "Data source is required",
  }),
  fields: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one field must be selected",
    "any.required": "At least one field must be selected",
  }),
  filters: Joi.array().items(filterSchema).optional().default([]),
  sortBy: Joi.string().optional().allow(null),
  sortOrder: Joi.string().valid("asc", "desc").optional().default("asc"),
  chartSummary: Joi.any().optional().allow(null),
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
    return next(new AppError("Validation failed", 400, errors));
  }
  req.body = value;
  next();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  validatePreviewReport: validate(previewReportSchema),
  validateExportReport: validate(exportReportSchema),
  validateAggregateReport: validate(aggregateReportSchema),
  validateAiGenerateConfig: validate(aiGenerateConfigSchema),
  validateAiInsights: validate(aiInsightsSchema),
};
