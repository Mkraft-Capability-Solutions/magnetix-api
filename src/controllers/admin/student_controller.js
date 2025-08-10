const AdminStudentService = require("../../services/admin/student_service");

exports.getAllStudents = async (req, res) => {
  try {
    const students = await AdminStudentService.getAllStudents();
    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getStudentById = async (req, res) => {
  try {
    const student = await AdminStudentService.getStudentById(
      req.params.studentId
    );
    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
exports.createStudent = async (req, res) => {
  try {
    const student = await AdminStudentService.createStudent(req.body);
    res.status(201).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.updateStudent = async (req, res) => {
  try {
    await AdminStudentService.updateStudent(req.params.studentId, req.body);
    res.json({
      success: true,
      message: "Student updated successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.deleteStudent = async (req, res) => {
  try {
    await AdminStudentService.deleteStudent(req.params.studentId);
    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
