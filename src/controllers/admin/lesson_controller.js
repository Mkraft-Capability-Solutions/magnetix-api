const AdminLessonService = require("../../services/admin/lesson_service");
const Joi = require("joi");

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const standaloneLessonSchema = Joi.object({
  title: Joi.string().required(),
  lessonType: Joi.string().valid("ILTS", "Content-Based").required(),

  // Content-Based fields
  contentType: Joi.string()
    .valid("document", "scorm", "mp4", "url")
    .when('lessonType', {
      is: 'Content-Based',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  lessonContentDocument: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.object().unknown(true),
      Joi.allow(null)
    )
    .optional(),
  scormPackage: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.object().unknown(true),
      Joi.allow(null)
    )
    .optional(),
  videoUpload: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.object().unknown(true),
      Joi.allow(null)
    )
    .optional(),
  contentUrl: Joi.string().allow("").optional(),
  lessonDuration: Joi.string().allow("").optional(),
  duration: Joi.string().allow("").optional(),
  description: Joi.string().allow("").optional(),

  // ILTS fields
  iltsType: Joi.string().valid("Online", "Offline").optional(),
  meetingUrl: Joi.string().allow("").optional(),
  meetUrl: Joi.string().allow("").optional(),
  eventVenue: Joi.string().allow("").optional(),
  venue: Joi.string().allow("").optional(),
  startDate: Joi.string().allow("").optional(),
  startTime: Joi.string().allow("").optional(),
  endDate: Joi.string().allow("").optional(),
  endTime: Joi.string().allow("").optional(),
});

// ============================================================================
// CONTROLLER METHODS
// ============================================================================

/**
 * Create a standalone lesson (not associated with any course)
 */
exports.createStandaloneLesson = async (req, res, next) => {
  try {
    console.log("createStandaloneLesson endpoint called with body:", JSON.stringify(req.body, null, 2));

    const { error } = standaloneLessonSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation errors:", error.details.map((detail) => detail.message));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const result = await AdminLessonService.createStandaloneLesson(
      req.user.uuid,
      req.body
    );

    res.status(201).json({
      success: true,
      message: "Standalone lesson created successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Error in createStandaloneLesson controller:", error);
    next(error);
  }
};

/**
 * Get all standalone lessons
 */
exports.getStandaloneLessons = async (req, res, next) => {
  try {
    const lessons = await AdminLessonService.getStandaloneLessons();

    res.json({
      success: true,
      data: lessons,
    });
  } catch (error) {
    console.error("Error in getStandaloneLessons controller:", error);
    next(error);
  }
};

/**
 * Get a single standalone lesson by ID
 */
exports.getStandaloneLessonById = async (req, res, next) => {
  try {
    const lessonId = req.params.lessonId;
    const lesson = await AdminLessonService.getStandaloneLessonById(lessonId);

    res.json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    console.error("Error in getStandaloneLessonById controller:", error);
    if (error.message === "Standalone lesson not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Update a standalone lesson
 */
exports.updateStandaloneLesson = async (req, res, next) => {
  try {
    const lessonId = req.params.lessonId;

    console.log("updateStandaloneLesson endpoint called for ID:", lessonId);

    const { error } = standaloneLessonSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation errors:", error.details.map((detail) => detail.message));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const result = await AdminLessonService.updateStandaloneLesson(
      lessonId,
      req.user.uuid,
      req.body
    );

    res.json({
      success: true,
      message: "Standalone lesson updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateStandaloneLesson controller:", error);
    if (error.message === "Standalone lesson not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Delete a standalone lesson
 */
exports.deleteStandaloneLesson = async (req, res, next) => {
  try {
    const lessonId = req.params.lessonId;

    const result = await AdminLessonService.deleteStandaloneLesson(lessonId);

    res.json({
      success: true,
      message: "Standalone lesson deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in deleteStandaloneLesson controller:", error);
    if (error.message === "Standalone lesson not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = exports;
