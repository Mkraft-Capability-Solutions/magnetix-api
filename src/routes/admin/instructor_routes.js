const express = require("express");
const router = express.Router();

const adminInstructorController = require("../../controllers/admin/instructor_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");
router.use(authenticate);
router.use(authorize(3));
router.get("/", adminInstructorController.getAllInstructors);
router.get("/:instructorId", adminInstructorController.getInstructorById);
router.post("/", adminInstructorController.createInstructor);
router.put("/:instructorId", adminInstructorController.updateInstructor);
router.delete("/:instructorId", adminInstructorController.deleteInstructor);
module.exports = router;
