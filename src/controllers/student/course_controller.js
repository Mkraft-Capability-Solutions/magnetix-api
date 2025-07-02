const courseService = require('../../services/student/course_service');

// Get subscribed courses
exports.getSubscribedCourses = async (req, res, next) => {
  try {
    const courses = await courseService.getSubscribedCourses(req.user.uuid);
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

// Explore available courses
exports.exploreCourses = async (req, res, next) => {
  try {
    const courses = await courseService.exploreCourses(req.user.uuid);
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

// Get course ratings
exports.getCourseRatings = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const ratings = await courseService.getCourseRatings(courseId);
    res.json(ratings);
  } catch (error) {
    next(error);
  }
};

// Enroll in a course
exports.enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const result = await courseService.enrollInCourse(req.user.uuid, courseId);
    res.json({ 
      success: true, 
      message: 'Enrolled successfully',
      course: result
    });
  } catch (error) {
    next(error);
  }
};