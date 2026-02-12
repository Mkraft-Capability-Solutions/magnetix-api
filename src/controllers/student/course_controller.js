const courseService = require('../../services/student/course_service');

exports.getSubscribedCourses = async (req, res, next) => {
  try {
    const response = await courseService.getSubscribedCourses(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.exploreCourses = async (req, res, next) => {
  try {
    const response = await courseService.exploreCourses(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getCourseReviews = async (req, res, next) => {
  try {
    const response = await courseService.getCourseReviews(req.params.courseId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getInstructorRating = async (req, res, next) => {
  try {
    const response = await courseService.getInstructorRating(req.params.instructorId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getCourseRating = async (req, res, next) => {
  try {
    const response = await courseService.getCourseRating(req.params.courseId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getRecommendedCourses = async (req, res, next) => {
  try {
    const response = await courseService.getRecommendedCourses(req.user.uuid);
    
    if (!response.success) {
      console.error('Failed to get recommendations:', response.error);
      return res.status(response.error.status || 500).json({
        success: false,
        error: response.error.message || 'Failed to load recommendations'
      });
    }
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error in getRecommendedCourses controller:', error);
    next(error);
  }
};


exports.enrollInCourse = async (req, res, next) => {
    try {
        const { course_id } = req.body;
        
        if (!course_id) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required in request body'
            });
        }

        const response = await courseService.enrollInCourse(req.user.uuid, course_id);
        if (!response.success) {
            return res.status(response.error.status || 500).json(response);
        }
        
        res.json({
            success: true,
            message: response.data.message,
            data: {
                courseId: course_id,
                firstLessonUnlocked: response.data.firstLessonUnlocked
            }
        });
    } catch (error) {
        next(error);
    }
};
exports.getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const response = await courseService.getCourseProgress(req.user.uuid, courseId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getLastAccessedCourse = async (req, res, next) => {
  try {
    const response = await courseService.getLastAccessedCourse(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.saveCourse = async (req, res, next) => {
  try {
    const { course_id } = req.body;
    const userId = req.user.uuid;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const response = await courseService.saveCourse(userId, course_id);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.unsaveCourse = async (req, res, next) => {
  try {
    const { course_id } = req.body;
    const userId = req.user.uuid;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const response = await courseService.unsaveCourse(userId, course_id);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getSavedCourses = async (req, res, next) => {
  try {
    const userId = req.user.uuid;
    const response = await courseService.getSavedCourses(userId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.isCourseSaved = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uuid;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const response = await courseService.isCourseSaved(userId, courseId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getCourseSkills = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const response = await courseService.getCourseSkills(courseId);
    res.status(response.success ? 200 : 500).json(response);
  } catch (err) {
    next(err);
  }
};

exports.getTotalAchievedSkills = async (req, res, next) => {
  try {
    const response = await courseService.getTotalAchievedSkills(req.user.uuid);
    res.status(response.success ? 200 : 500).json(response);
  } catch (err) {
    next(err);
  }
};

exports.getGainedSkillsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const response = await courseService.getGainedSkillsByCourse(req.user.uuid, courseId);
    res.status(response.success ? 200 : 500).json(response);
  } catch (err) {
    next(err);
  }
};

exports.getRemainingSkillsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const response = await courseService.getRemainingSkillsByCourse(req.user.uuid, courseId);
    res.status(response.success ? 200 : 500).json(response);
  } catch (err) {
    next(err);
  }
};

exports.getCourseDetails = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uuid;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const response = await courseService.getCourseDetails(userId, courseId);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.getLessonById = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.uuid;

    console.log('getLessonById called with courseId:', courseId, 'lessonId:', lessonId, 'userId:', userId);

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and Lesson ID are required'
      });
    }

    const lesson = await courseService.getLessonById(courseId, lessonId, userId);

    res.json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    console.error('Error in getLessonById:', error);
    if (error.message === 'Lesson not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

exports.markLessonCompleted = async (req, res, next) => {
    try {
        // Support both URL params (new) and body params (legacy) for backward compatibility
        const lessonId = req.params.lessonId || req.body.lessonId;
        const courseId = req.params.courseId || req.body.courseId;
        const userId = req.user.uuid;

        if (!lessonId || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Lesson ID and Course ID are required'
            });
        }

        const response = await courseService.markLessonCompleted(userId, lessonId, courseId);

        if (!response.success) {
            return res.status(response.error.status || 500).json(response);
        }

        res.json(response);
    } catch (error) {
        next(error);
    }
};

// Get user's rating for a specific course
exports.getUserCourseRating = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uuid;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const response = await courseService.getUserCourseRating(userId, courseId);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Submit a new course rating
exports.submitCourseRating = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uuid;
    const { rating, review } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be between 1 and 5'
      });
    }

    const response = await courseService.submitCourseRating(userId, courseId, rating, review);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// Update an existing course rating
exports.updateCourseRating = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uuid;
    const { rating, review } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be between 1 and 5'
      });
    }

    const response = await courseService.updateCourseRating(userId, courseId, rating, review);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};