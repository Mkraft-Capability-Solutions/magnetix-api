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
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
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