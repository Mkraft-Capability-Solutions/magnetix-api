const express = require("express");
const router = express.Router();
const adminStudentController = require("../../controllers/admin/student_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(3));

router.get("/", adminStudentController.getAllStudents);
router.get("/:studentId", adminStudentController.getStudentById);
router.post("/", adminStudentController.createStudent);
router.put("/:studentId", adminStudentController.updateStudent);
router.delete("/:studentId", adminStudentController.deleteStudent);

module.exports = router;
