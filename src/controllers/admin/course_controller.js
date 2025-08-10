const AdminCourseService = require("../../services/admin/course_service");

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await AdminCourseService.getAllCourses();
    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getCourse = async (req, res) => {
  try {
    const course = await AdminCourseService.getCourseById(req.params.id);
    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
exports.createCourse = async (req, res) => {
  try {
    const courseId = await AdminCourseService.createCourse(req.body);
    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: { courseId },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.updateCourse = async (req, res) => {
  try {
    await AdminCourseService.updateCourse(req.params.id, req.body);
    res.json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.deleteCourse = async (req, res) => {
  try {
    await AdminCourseService.deleteCourse(req.params.id);
    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.getCourseByInstructor = async (req, res) => {
  try {
    const courses = await AdminCourseService.getCoursesByInstructor(
      req.params.instructorId
    );
    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
