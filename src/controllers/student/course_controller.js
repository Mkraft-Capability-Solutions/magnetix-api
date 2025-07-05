const courseService = require('../../services/student/course_service');

exports.getSubscribedCourses = async (req, res, next) => {
  try {
    const courses = await courseService.getSubscribedCourses(req.user.uuid);
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

exports.exploreCourses = async (req, res, next) => {
  try {
    const courses = await courseService.exploreCourses(req.user.uuid);
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};
exports.getCourseReviews = async (req, res, next) => {
  try {
    const reviews = await courseService.getCourseReviews(req.params.courseId);
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

exports.getInstructorRating = async (req, res, next) => {
  try {
    const rating = await courseService.getInstructorRating(req.params.instructorId);
    res.json({
      success: true,
      data: rating
    });
  } catch (error) {
    next(error);
  }
};

exports.getCourseRating = async (req, res, next) => {
  try {
    const rating = await courseService.getCourseRating(req.params.courseId);
    res.json({
      success: true,
      data: rating
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecommendedCourses = async (req, res, next) => {
  try {
    const courses = await courseService.getRecommendedCourses(req.user.uuid);
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

exports.enrollInCourse = async (req, res, next) => {
  try {
    const { course_id } = req.body;
    
    console.log(`Enrollment attempt - Student: ${req.user.uuid}, Course: ${course_id}`);
    
    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required in request body'
      });
    }

    const result = await courseService.enrollInCourse(req.user.uuid, course_id);
    
    res.json({
      success: true,
      message: result.message || 'Successfully enrolled in the course'
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    next(error);
  }
};
