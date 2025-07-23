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
    res.json(response);
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