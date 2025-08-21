const e = require("express");
const instructorCourseService = require("../../services/instructor/course_service");
const Joi = require("joi");

// Validation schemas
const courseSchema = Joi.object({
  id: Joi.number().optional().allow(null),
  creator_id: Joi.string().optional().allow(""),
  title: Joi.string().required(),
  instructor: Joi.string().optional().allow(""),
  shortDescription: Joi.string().allow("").optional(),
  description: Joi.string().allow("").optional(),
  languageId: Joi.number().integer().min(1).required(),
  categoryId: Joi.number().integer().min(1).required(),
  subCategoryId: Joi.number().integer().min(1).required(),
  level: Joi.string().valid("beginner", "intermediate", "advance").required(),
  courseDuration: Joi.string().allow("").optional(),
  sections: Joi.array(),
  thumbnail: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.object().unknown(true) // File object
    )
    .optional(),
  mediaType: Joi.string().allow("").optional(),
  mediaUrl: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.object().unknown(true) // File object
    )
    .optional(),
  metaKeywords: Joi.string().allow("").optional().default([]),
  metaDescription: Joi.string().allow("").optional(),
  outcomes: Joi.array().items(Joi.string()).optional().default([]),
  requirements: Joi.array().items(Joi.string()).optional().default([]),
  faqs: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().required(),
        answer: Joi.string().required(),
      })
    )
    .optional()
    .default([]),
  lessons: Joi.array()
    .items(
      Joi.object({
        id: Joi.alternatives()
          .try(Joi.number(), Joi.string())
          .optional()
          .allow(null),
        title: Joi.string().required(),
        section: Joi.string().required(),
        lessonType: Joi.string().valid("ILTS", "Content-Based").required(),
        skills: Joi.array().items(Joi.string()).optional().default([]),

        // Content-Based fields
        contentType: Joi.string()
          .valid("document", "scorm", "mp4", "url")
          .optional(),
        lessonContentDocument: Joi.alternatives()
          .try(
            Joi.string().allow(""),
            Joi.object().unknown(true),
            Joi.allow(null)
          )
          .optional(),
        scromPackage: Joi.alternatives()
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
        description: Joi.string().allow("").optional(),

        // ILTS fields
        iltsType: Joi.string().valid("Online", "Offline").optional(),
        iltsUrl: Joi.string().allow("").optional(),
        startDate: Joi.string().allow("").optional(),
        startTime: Joi.string().allow("").optional(),
        endDate: Joi.string().allow("").optional(),
        endTime: Joi.string().allow("").optional(),
        eventVenue: Joi.string().allow("").optional(),
        meetUrl: Joi.string().allow("").optional(),
      })
    )
    .optional()
    .default([]),
});

exports.addCourse = async (req, res, next) => {
  try {
    console.log(
      "addCourse endpoint called with body:",
      JSON.stringify(req.body, null, 2)
    );

    const { error } = courseSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log(
        "Validation errors:",
        error.details.map((detail) => detail.message)
      );
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const result = await instructorCourseService.addCourse(
      req.user.uuid,
      req.body
    );
    console.log("Course creation result:", result);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Error in addCourse controller:", error);
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    console.log(
      "updateCourse endpoint called with ID:",
      req.params.courseId,
      "body:",
      JSON.stringify(req.body, null, 2)
    );

    const { error } = courseSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log(
        "Validation errors:",
        error.details.map((detail) => detail.message)
      );
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const result = await instructorCourseService.updateCourse(
      req.user.uuid,
      req.params.courseId,
      req.body
    );
    console.log("Course update result:", result);

    res.json({
      success: true,
      message: "Course updated successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Error in updateCourse controller:", error);
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    await instructorCourseService.deleteCourse(
      req.user.uuid,
      req.params.courseId
    );
    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get instructor's active courses
exports.getInstructorActiveCourses = async (req, res) => {
  try {
    const courses = await instructorCourseService.getInstructorActiveCourses(
      req.user.uuid
    );
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error("Error fetching instructor active courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active courses",
      error: error.message,
    });
  }
};

// Get instructor's pending courses
exports.getInstructorPendingCourses = async (req, res) => {
  try {
    const courses = await instructorCourseService.getInstructorPendingCourses(
      req.user.uuid
    );
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error("Error fetching instructor pending courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pending courses",
      error: error.message,
    });
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await instructorCourseService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubCategories = async (req, res, next) => {
  try {
    const subCategories = await instructorCourseService.getSubCategories();
    res.json({
      success: true,
      data: subCategories,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLanguages = async (req, res, next) => {
  try {
    const languages = await instructorCourseService.getLanguages();
    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEnrolledStudents = async (req, res, next) => {
  try {
    const students = await instructorCourseService.getEnrolledStudents(
      req.params.courseId,
      req.user.uuid
    );

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCourseDetailsById = async (req, res, next) => {
  try {
    console.log("getCourseDetailsById called for course:", req.params.courseId);

    const courseDetails = await instructorCourseService.getCourseDetailsById(
      req.params.courseId,
      req.user.uuid
    );

    console.log(
      "Course details retrieved:",
      JSON.stringify(courseDetails, null, 2)
    );

    res.json({
      success: true,
      data: courseDetails,
    });
  } catch (error) {
    console.error("Error in getCourseDetailsById:", error);
    next(error);
  }
};

exports.getEnrolledStudentsWithProgress = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const data = await instructorCourseService.getEnrolledStudentsWithProgress(
      courseId,
      req.user.uuid
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getEnrolledStudentsWithProgress:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get enrolled students with progress",
      error: error.message,
    });
  }
};

// router.post(
//   "courses/:courseId/requirements",
//   instructorCourseController.addCourseRequirements
// );
// router.post(
//   "courses/:courseId/outcomes",
//   instructorCourseController.addCourseOutcomes
// );
// router.post("courses/:courseId/faqs", instructorCourseController.addCourseFAQs);

exports.addCourseRequirements = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const requirements = req.body.requirements;

    if (!Array.isArray(requirements)) {
      return res.status(400).json({
        success: false,
        message: "Requirements must be an array",
      });
    }
    const result = await instructorCourseService.addCourseRequirements(
      courseId,
      requirements,
      req.user.uuid
    );

    res.json({
      success: true,
      message: "Course requirements added successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in addCourseRequirements:", error);
    next(error);
  }
};
exports.addCourseOutcomes = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const outcomes = req.body.outcomes;
    // outcomes.creatorId = req.user.uuid; // Not needed, handled in service
    if (!Array.isArray(outcomes)) {
      return res.status(400).json({
        success: false,
        message: "Outcomes must be an array",
      });
    }

    const result = await instructorCourseService.addCourseOutcomes(
      courseId,
      outcomes,
      req.user.uuid
    );

    res.json({
      success: true,
      message: "Course outcomes added successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in addCourseOutcomes:", error);
    next(error);
  }
};
// router.put(
//   "/courses/:courseId/meta",
//   instructorCourseController.updateMetaKeywords
// );

exports.updateMetaKeywords = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const { metaKeywords, metaDescription } = req.body;
    // metaKeywords.creatorId = req.user.uuid; // Not needed, handled in service
    if (!metaKeywords || typeof metaKeywords !== "string") {
      return res.status(400).json({
        success: false,
        message: "Meta keywords must be a string",
      });
    }

    const result = await instructorCourseService.updateMetaKeywords(
      courseId,
      metaKeywords,
      metaDescription,
      req.user.uuid
    );

    res.json({
      success: true,
      message: "Meta keywords updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateMetaKeywords:", error);
    next(error);
  }
};
exports.addCourseFAQs = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const faqs = req.body.faqs;
    // faqs.creatorId = req.user.uuid; // Not needed, handled in service
    if (!Array.isArray(faqs)) {
      return res.status(400).json({
        success: false,
        message: "FAQs must be an array",
      });
    }

    const result = await instructorCourseService.addCourseFAQs(courseId, faqs, req.user.uuid);

    res.json({
      success: true,
      message: "Course FAQs added successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in addCourseFAQs:", error);
    next(error);
  }
};

// router.post("course/:courseId/section", instructorCourseController.addSection);
exports.addSection = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const section = req.body.title;
    const creatorId = req.user.uuid;

    if (!section) {
      return res.status(400).json({
        success: false,
        message: "Section is required",
      });
    }

    const result = await instructorCourseService.addSection(
      courseId,
      section,
      creatorId
    );

    res.json({
      success: true,
      message: "Section added successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in addSection:", error);
    next(error);
  }
};
exports.addLesson = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const creatorId = req.user.uuid;
    const lesson = req.body;
    // Validation
    if (!lesson.title || !lesson.sectionId) {
      return res.status(400).json({
        success: false,
        message: "Title and sectionId are required for each lesson",
      });
    }

    // Save lessons
    const result = await instructorCourseService.addLesson(
      courseId,
      lesson,
      creatorId
    );

    res.json({
      success: true,
      message: "Lesson(s) added successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in addLesson:", error);
    next(error);
  }
};

// Individual section update controllers for editing
exports.updateCourseBasicInfo = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const { title, shortDescription, description, category, subcategory, level, language, courseDuration } = req.body;
    const updatedBy = req.user.uuid;

    const result = await instructorCourseService.updateCourseBasicInfo(
      courseId,
      {
        title,
        shortDescription,  
        description,
        categoryId: category,
        subCategoryId: subcategory,
        level,
        languageId: language,
        courseDuration
      },
      updatedBy
    );

    res.json({
      success: true,
      message: "Course basic information updated successfully", 
      data: result,
    });
  } catch (error) {
    console.error("Error in updateCourseBasicInfo:", error);
    next(error);
  }
};

exports.updateCourseDetails = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const { requirements, outcomes, faqs } = req.body;
    const updatedBy = req.user.uuid;

    // Clear existing data first, then add new data
    const result = await instructorCourseService.updateCourseDetails(
      courseId,
      { requirements, outcomes, faqs },
      updatedBy
    );

    res.json({
      success: true,
      message: "Course details updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateCourseDetails:", error);
    next(error);
  }
};

exports.updateCourseMedia = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const { mediaType, mediaUrl } = req.body;
    const updatedBy = req.user.uuid;

    const result = await instructorCourseService.updateCourseMedia(
      courseId,
      { mediaType, mediaUrl },
      updatedBy  
    );

    res.json({
      success: true,
      message: "Course media updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateCourseMedia:", error);
    next(error);
  }
};

exports.updateLesson = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const lessonId = req.params.lessonId;
    const lessonData = req.body;
    const updatedBy = req.user.uuid;

    const result = await instructorCourseService.updateLesson(
      courseId,
      lessonId, 
      lessonData,
      updatedBy
    );

    res.json({
      success: true,
      message: "Lesson updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateLesson:", error);
    next(error);
  }
};

exports.deleteLesson = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const lessonId = req.params.lessonId;

    const result = await instructorCourseService.deleteLesson(courseId, lessonId);

    res.json({
      success: true,
      message: "Lesson deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in deleteLesson:", error);
    next(error);
  }
};

exports.getSectionsByCourseId = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const sections = await instructorCourseService.getSectionsByCourseId(
      courseId
    );

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error("Error in getSectionsByCourseId:", error);
    next(error);
  }
};
