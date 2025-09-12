const express = require("express");
const router = express.Router();
const instructorCourseController = require("../../controllers/instructor/course_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(2));

// Course CRUD operations
router.post("/courses", instructorCourseController.addCourse);
router.put("/courses/:courseId", instructorCourseController.updateCourse);
router.delete("/courses/:courseId", instructorCourseController.deleteCourse);
router.get(
  "/courses/:courseId",
  instructorCourseController.getCourseDetailsById
);
//course update operations
router.put(
  "/courses/:courseId/requirements",
  instructorCourseController.addCourseRequirements
);
router.put(
  "/courses/:courseId/outcomes",
  instructorCourseController.addCourseOutcomes
);
router.put(
  "/courses/:courseId/faqs",
  instructorCourseController.addCourseFAQs
);
router.put(
  "/courses/:courseId/meta",
  instructorCourseController.updateMetaKeywords
);
router.post(
  "/courses/:courseId/sections",
  instructorCourseController.addSection
);
router.post("/courses/:courseId/lessons", instructorCourseController.addLesson);

// Individual section update endpoints for editing
router.put(
  "/courses/:courseId/basic",
  instructorCourseController.updateCourseBasicInfo
);
router.put(
  "/courses/:courseId/details",
  instructorCourseController.updateCourseDetails  
);
router.put(
  "/courses/:courseId/media",
  instructorCourseController.updateCourseMedia
);
router.put(
  "/courses/:courseId/lessons/:lessonId",
  instructorCourseController.updateLesson
);
router.delete(
  "/courses/:courseId/lessons/:lessonId", 
  instructorCourseController.deleteLesson
);
router.get(
  "/courses/:courseId/sections",
  instructorCourseController.getSectionsByCourseId
);
// Get courses// Get instructor's own courses (not from stored procedure)
router.get(
  "/courses/instructor/active",
  instructorCourseController.getInstructorActiveCourses
);
router.get(
  "/courses/instructor/pending",
  instructorCourseController.getInstructorPendingCourses
);

// Get metadata
router.get("/metadata/categories", instructorCourseController.getCategories);
router.get(
  "/metadata/subcategories",
  instructorCourseController.getSubCategories
);
router.get("/metadata/languages", instructorCourseController.getLanguages);

// Get enrolled students
router.get(
  "/courses/:courseId/students",
  instructorCourseController.getEnrolledStudents
);
router.get(
  "/courses/:courseId/enrollments/progress",
  instructorCourseController.getEnrolledStudentsWithProgress
);

// Course Analytics
router.get(
  "/courses/:courseId/analytics",
  instructorCourseController.getCourseAnalytics
);

module.exports = router;
