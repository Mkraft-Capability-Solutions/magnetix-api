// instructor_course_controller.js
const instructorCourseService = require('../../services/instructor/course_service');
const Joi = require('joi');

// Validation schemas
const courseSchema = Joi.object({
    title: Joi.string().required(),
    shortDescription: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional(),
    languageId: Joi.number().integer().min(1).required(),
    categoryId: Joi.number().integer().min(1).required(),
    subCategoryId: Joi.number().integer().min(1).required(),
    level: Joi.string().valid('beginner', 'intermediate', 'advance').required(),
    courseDuration: Joi.string().allow('').optional(),
    thumbnail: Joi.string().allow('').optional(),
    courseOverviewProvider: Joi.string().allow('').optional(),
    courseOverviewVideoUrl: Joi.string().allow('').optional(),
    metaKeywords: Joi.string().allow('').optional(),
    metaDescription: Joi.string().allow('').optional(),
    outcomes: Joi.array().items(Joi.string()).optional(),
    requirements: Joi.array().items(Joi.string()).optional(),
    faqs: Joi.array().items(Joi.object({
        question: Joi.string().required(),
        answer: Joi.string().required()
    })).optional(),
    sections: Joi.array().items(Joi.object({
        title: Joi.string().required(),
        lessons: Joi.array().items(Joi.object({
            title: Joi.string().required(),
            lessonType: Joi.string().valid('ILTS', 'Content-Based').required(),
            lessonContentType: Joi.string().valid('document', 'scorm', 'mp4', 'content_url').optional(),
            lessonContentDocument: Joi.string().allow('').optional(),
            lessonContentScorm: Joi.string().allow('').optional(),
            lessonContentMp4: Joi.string().allow('').optional(),
            lessonContentUrl: Joi.string().allow('').optional(),
            lessonDuration: Joi.string().allow('').optional(),
            skills: Joi.array().items(Joi.string()).optional(),
            iltsMode: Joi.string().valid('Online', 'Offline').when('lessonType', {
                is: 'ILTS',
                then: Joi.required(),
                otherwise: Joi.forbidden()
            }),
            meetUrl: Joi.string().when('iltsMode', {
                is: 'Online',
                then: Joi.string().uri().required(),
                otherwise: Joi.forbidden()
            }),
            venue: Joi.string().when('iltsMode', {
                is: 'Offline',
                then: Joi.string().required(),
                otherwise: Joi.forbidden()
            }),
            startDate: Joi.date().when('lessonType', {
                is: 'ILTS',
                then: Joi.required(),
                otherwise: Joi.forbidden()
            }),
            startTime: Joi.string().when('lessonType', {
                is: 'ILTS',
                then: Joi.required(),
                otherwise: Joi.forbidden()
            }),
            endDate: Joi.date().when('lessonType', {
                is: 'ILTS',
                then: Joi.required(),
                otherwise: Joi.forbidden()
            }),
            endTime: Joi.string().when('lessonType', {
                is: 'ILTS',
                then: Joi.required(),
                otherwise: Joi.forbidden()
            })
        })).optional()
    })).optional()
});

exports.addCourse = async (req, res, next) => {
  try {
    const { error } = courseSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }

    const result = await instructorCourseService.addCourse(req.user.uuid, req.body);
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      courseId: result.courseId
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
    try {
        const { error } = courseSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        await instructorCourseService.updateCourse(req.user.uuid, req.params.courseId, req.body);
        res.json({
            success: true,
            message: 'Course updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteCourse = async (req, res, next) => {
    try {
        await instructorCourseService.deleteCourse(req.user.uuid, req.params.courseId);
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get instructor's active courses
exports.getInstructorActiveCourses = async (req, res) => {
    try {
        const courses = await instructorCourseService.getInstructorActiveCourses(req.user.uuid);
        res.json({ success: true, data: courses });
    } catch (error) {
        console.error("Error fetching instructor active courses:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active courses',
            error: error.message
        });
    }
};

// Get instructor's pending courses
exports.getInstructorPendingCourses = async (req, res) => {
    try {
        const courses = await instructorCourseService.getInstructorPendingCourses(req.user.uuid);
        res.json({ success: true, data: courses });
    } catch (error) {
        console.error("Error fetching instructor pending courses:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending courses',
            error: error.message
        });
    }
};



exports.getCategories = async (req, res, next) => {
    try {
        const categories = await instructorCourseService.getCategories();
        res.json({
            success: true,
            data: categories
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
            data: subCategories
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
            data: languages
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
            data: students
        });
    } catch (error) {
        next(error);
    }
};

exports.getCourseDetailsById = async (req, res, next) => {
    try {
        const courseDetails = await instructorCourseService.getCourseDetailsById(
            req.params.courseId,
            req.user.uuid
        );
        
        res.json({
            success: true,
            data: courseDetails
        });
    } catch (error) {
        next(error);
    }
};

exports.getEnrolledStudentsWithProgress = async (req, res, next) => {
    try {
        const courseId = req.params.courseId;
        const data = await instructorCourseService.getEnrolledStudentsWithProgress(courseId, req.user.uuid);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getEnrolledStudentsWithProgress:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to get enrolled students with progress',
            error: error.message
        });
    }
};
