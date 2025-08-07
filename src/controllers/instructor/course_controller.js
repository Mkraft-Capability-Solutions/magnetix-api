const InstructorCourseService = require('../../services/instructor/course_service');
const { authenticate } = require('../../middleware/auth_middleware');
const Joi = require('joi');

// Validation schemas
const courseSchema = Joi.object({
  title: Joi.string().required().max(255),
  short_description: Joi.string().required().max(500),
  description: Joi.string().required(),
  language_id: Joi.number().integer().required(),
  category_id: Joi.number().integer().required(),
  sub_category_id: Joi.number().integer().required(),
  level: Joi.string().valid('beginner', 'intermediate', 'advance').required(),
  course_duration: Joi.string().max(50).allow(null, ''),
  thumbnail: Joi.string().uri().allow(null, ''),
  course_overview_provider: Joi.string().max(50).allow(null, ''),
  course_overview_video_url: Joi.string().uri().allow(null, ''),
  course_type: Joi.string().allow(null, ''),
  meta_keywords: Joi.string().allow(null, ''),
  meta_description: Joi.string().allow(null, ''),
  sections: Joi.array().items(
    Joi.object({
      title: Joi.string().required().max(255),
      lessons: Joi.array().items(
        Joi.object({
          title: Joi.string().required().max(255),
          lesson_type: Joi.string().valid('ILTS', 'Content-Based').required(),
          lesson_content_type: Joi.string().valid('document', 'scorm', 'mp4', 'content_url').allow(null, ''),
          lesson_content_document: Joi.string().when('lesson_content_type', {
            is: 'document',
            then: Joi.string().uri().required(),
            otherwise: Joi.string().allow(null, '')
          }),
          lesson_content_scorm: Joi.string().when('lesson_content_type', {
            is: 'scorm',
            then: Joi.string().uri().required(),
            otherwise: Joi.string().allow(null, '')
          }),
          lesson_content_mp4: Joi.string().when('lesson_content_type', {
            is: 'mp4',
            then: Joi.string().uri().required(),
            otherwise: Joi.string().allow(null, '')
          }),
          lesson_content_url: Joi.string().when('lesson_content_type', {
            is: 'content_url',
            then: Joi.string().uri().required(),
            otherwise: Joi.string().allow(null, '')
          }),
          lesson_duration: Joi.string().max(255).allow(null, ''),
          skills: Joi.array().items(Joi.number().integer()).optional(),
          lesson_mode: Joi.string().when('lesson_type', {
            is: 'ILTS',
            then: Joi.string().valid('Online', 'Offline').required(),
            otherwise: Joi.string().allow(null, '')
          }),
          meet_url: Joi.string().when('lesson_type', {
            is: 'ILTS',
            then: Joi.string().uri().required(),
            otherwise: Joi.string().allow(null, '')
          }),
          venue: Joi.string().allow(null, ''),
          start_date: Joi.date().when('lesson_type', {
            is: 'ILTS',
            then: Joi.date().required(),
            otherwise: Joi.date().allow(null)
          }),
          start_time: Joi.string().when('lesson_type', {
            is: 'ILTS',
            then: Joi.string().required(),
            otherwise: Joi.string().allow(null, '')
          }),
          end_date: Joi.date().when('lesson_type', {
            is: 'ILTS',
            then: Joi.date().required(),
            otherwise: Joi.date().allow(null)
          }),
          end_time: Joi.string().when('lesson_type', {
            is: 'ILTS',
            then: Joi.string().required(),
            otherwise: Joi.string().allow(null, '')
          })
        })
      ).required()
    })
  ).required(),
  faqs: Joi.array().items(
    Joi.object({
      question: Joi.string().required().max(255),
      answer: Joi.string().required().max(255)
    })
  ).optional(),
  requirements: Joi.array().items(
    Joi.object({
      requirement: Joi.string().required().max(255)
    })
  ).optional(),
  outcomes: Joi.array().items(
    Joi.object({
      outcome: Joi.string().required().max(255)
    })
  ).optional()
});

const updateCourseSchema = courseSchema.keys({
  id: Joi.number().integer().required()
});

exports.addCourse = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = courseSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        messages: errorMessages
      });
    }

    const course = await InstructorCourseService.addCourse(value, req.user.uuid);
    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { error } = updateCourseSchema.validate({
      ...req.body,
      id: req.params.courseId
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const course = await InstructorCourseService.updateCourse(
      req.params.courseId,
      req.body,
      req.user.uuid
    );
    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyActiveCourses = async (req, res, next) => {
  try {
    const courses = await InstructorCourseService.getMyActiveCourses(req.user.uuid);
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyPendingCourses = async (req, res, next) => {
  try {
    const courses = await InstructorCourseService.getMyPendingCourses(req.user.uuid);
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await InstructorCourseService.getCategories();
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
    const subCategories = await InstructorCourseService.getSubCategories(req.query.category_id || null);
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
    const languages = await InstructorCourseService.getLanguages();
    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const success = await InstructorCourseService.deleteCourse(
      req.params.courseId,
      req.user.uuid
    );
    res.json({
      success,
      message: success ? 'Course deleted successfully' : 'Course not found or not owned by you'
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllEnrolledStudents = async (req, res, next) => {
  try {
    const students = await InstructorCourseService.getAllEnrolledStudents(req.params.courseId);
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    next(error);
  }
};