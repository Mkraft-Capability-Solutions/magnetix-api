const express = require("express");
const router = express.Router();
const adminCourseController = require("../../controllers/admin/course_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");
router.use(authenticate);
router.use(authorize(3));

router.get("/", adminCourseController.getAllCourses);
router.get("/:courseId", adminCourseController.getCourse);
router.post("/", adminCourseController.createCourse);
router.put("/:courseId", adminCourseController.updateCourse);
router.delete("/:courseId", adminCourseController.deleteCourse);
router.patch("/:courseId/approve", adminCourseController.approveCourse);
router.patch("/:courseId/reject", adminCourseController.rejectCourse);
router.get("/:courseId/details", adminCourseController.getCourseDetails);

module.exports = router;