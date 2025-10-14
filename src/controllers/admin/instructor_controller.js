const AdminInstructorService = require("../../services/admin/instructor_service");

exports.getAllInstructors = async (req, res) => {
  try {
    const instructors = await AdminInstructorService.getAllInstructors();
    res.json({
      success: true,
      data: instructors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getInstructorById = async (req, res) => {
  try {
    const instructor = await AdminInstructorService.getInstructorById(
      req.params.instructorId
    );
    res.json({
      success: true,
      data: instructor,
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
exports.createInstructor = async (req, res) => {
  try {
    const instructor = await AdminInstructorService.createInstructor(req.body);
    res.status(201).json({
      success: true,
      data: instructor,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.updateInstructor = async (req, res) => {
  try {
    await AdminInstructorService.updateInstructor(
      req.params.instructorId,
      req.body
    );
    res.json({
      success: true,
      message: "Instructor updated successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.deleteInstructor = async (req, res) => {
  try {
    await AdminInstructorService.deleteInstructor(req.params.instructorId);
    res.json({
      success: true,
      message: "Instructor deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Featured Mentors Controllers
exports.getFeaturedMentors = async (req, res) => {
  try {
    const featuredMentors = await AdminInstructorService.getFeaturedMentors();
    res.json({
      success: true,
      data: featuredMentors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addFeaturedMentor = async (req, res) => {
  try {
    await AdminInstructorService.addFeaturedMentor(req.params.instructorId);
    res.json({
      success: true,
      message: "Instructor marked as featured successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.removeFeaturedMentor = async (req, res) => {
  try {
    await AdminInstructorService.removeFeaturedMentor(req.params.instructorId);
    res.json({
      success: true,
      message: "Instructor unmarked as featured successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
