const e = require("express");
const AdminCourseService = require("../../services/admin/course_service");
const batchAssignmentService = require("../../services/batch_assignment_service");

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
    const course = await AdminCourseService.getCourseById(req.params.courseId);

    // Get batch assignments for the course
    const batchInfo = await batchAssignmentService.getCourseBatches(req.params.courseId);
    course.availableToAllBatches = batchInfo.availableToAll;
    course.batches = batchInfo.batches;

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
    // Extract batch-related fields from request
    let batchIds = [];
    let availableToAllBatches = false;

    if (req.body.availableToAllBatches === true || req.body.availableToAllBatches === 'true') {
      availableToAllBatches = true;
    } else if (req.body.batchIds) {
      // Parse batchIds if it's a string (from FormData)
      batchIds = typeof req.body.batchIds === 'string'
        ? JSON.parse(req.body.batchIds)
        : req.body.batchIds;
    }

    // Create the course
    const courseId = await AdminCourseService.createCourse(req.body);

    // Assign batches to the course
    await batchAssignmentService.assignBatchesToCourse(courseId, batchIds, availableToAllBatches);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: { courseId },
    });
  } catch (error) {
    console.error('Error in createCourse controller:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.updateCourse = async (req, res) => {
  try {
    await AdminCourseService.updateCourse(req.params.id, req.body);

    // Handle batch updates if provided
    if (req.body.hasOwnProperty('availableToAllBatches') || req.body.batchIds) {
      let batchIds = [];
      let availableToAllBatches = false;

      if (req.body.availableToAllBatches === true || req.body.availableToAllBatches === 'true') {
        availableToAllBatches = true;
      } else if (req.body.batchIds) {
        batchIds = typeof req.body.batchIds === 'string'
          ? JSON.parse(req.body.batchIds)
          : req.body.batchIds;
      }

      await batchAssignmentService.assignBatchesToCourse(req.params.id, batchIds, availableToAllBatches);
    }

    res.json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error('Error in updateCourse controller:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};
// exports.deleteCourse = async (req, res) => {
//   try {
//     await AdminCourseService.deleteCourse(req.params.id);
//     res.json({
//       success: true,
//       message: "Course deleted successfully",
//     });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };
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

exports.approveCourse = async (req, res) => {
  try {
    await AdminCourseService.approveCourse(req.params.courseId);
    res.json({
      success: true,
      message: "Course approved successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

exports.rejectCourse = async (req, res) => {  
  try {
    await AdminCourseService.rejectCourse(req.params.courseId);
    res.json({
      success: true,
      message: "Course rejected successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
exports.deleteCourse = async (req, res) => {  
  try {
    await AdminCourseService.deleteCourse(req.params.courseId);
    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

exports.getCourseDetails = async (req, res) => {
  try {
    const courseDetails = await AdminCourseService.getCourseDetails(req.params.courseId);
    res.json({
      success: true,
      data: courseDetails,
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};