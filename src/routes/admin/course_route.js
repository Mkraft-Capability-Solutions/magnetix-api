const express = require("express");
const router = express.Router();
const adminCourseController = require("../../controllers/admin/course_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

// ============================================================================
// COURSE CRUD OPERATIONS
// ============================================================================

router.post("/courses", adminCourseController.addCourse);
router.put("/courses/:courseId", adminCourseController.updateCourse);
router.delete("/courses/:courseId", adminCourseController.deleteCourse);

// ============================================================================
// COURSE UPDATE OPERATIONS (Requirements, Outcomes, FAQs, Meta)
// ============================================================================

router.put(
  "/courses/:courseId/requirements",
  adminCourseController.addCourseRequirements
);
router.put(
  "/courses/:courseId/outcomes",
  adminCourseController.addCourseOutcomes
);
router.put(
  "/courses/:courseId/faqs",
  adminCourseController.addCourseFAQs
);
router.put(
  "/courses/:courseId/meta",
  adminCourseController.updateMetaKeywords
);

// ============================================================================
// SECTIONS AND LESSONS
// ============================================================================

router.post(
  "/courses/:courseId/sections",
  adminCourseController.addSection
);
router.get(
  "/courses/:courseId/sections",
  adminCourseController.getSectionsByCourseId
);
router.post(
  "/courses/:courseId/lessons",
  adminCourseController.addLesson
);
router.put(
  "/courses/:courseId/lessons/:lessonId",
  adminCourseController.updateLesson
);
router.delete(
  "/courses/:courseId/lessons/:lessonId",
  adminCourseController.deleteLesson
);

// ============================================================================
// INDIVIDUAL SECTION UPDATE ENDPOINTS (for editing)
// ============================================================================

router.put(
  "/courses/:courseId/basic",
  adminCourseController.updateCourseBasicInfo
);
router.put(
  "/courses/:courseId/details",
  adminCourseController.updateCourseDetails
);
router.put(
  "/courses/:courseId/media",
  adminCourseController.updateCourseMedia
);

// ============================================================================
// GET COURSES (Admin-specific - all courses)
// ============================================================================

router.get(
  "/courses/admin/active",
  adminCourseController.getAdminActiveCourses
);
router.get(
  "/courses/admin/pending",
  adminCourseController.getAdminPendingCourses
);

// ============================================================================
// METADATA (Categories, Subcategories, Languages)
// ============================================================================

router.get("/metadata/categories", adminCourseController.getCategories);
router.get("/metadata/subcategories", adminCourseController.getSubCategories);
router.get("/metadata/languages", adminCourseController.getLanguages);
router.post("/metadata/categories", adminCourseController.addCategory);
router.post("/metadata/subcategories", adminCourseController.addSubCategory);

// ============================================================================
// STUDENT ENROLLMENT AND ANALYTICS
// ============================================================================

router.get(
  "/courses/:courseId/students",
  adminCourseController.getEnrolledStudents
);
router.get(
  "/courses/:courseId/enrollments/progress",
  adminCourseController.getEnrolledStudentsWithProgress
);
router.get(
  "/courses/:courseId/analytics",
  adminCourseController.getCourseAnalytics
);
router.get(
  "/courses/:courseId/batches",
  adminCourseController.getCourseBatches
);

// ============================================================================
// ADMIN-SPECIFIC OPERATIONS
// ============================================================================

router.patch("/courses/:courseId/approve", adminCourseController.approveCourse);
router.patch("/courses/:courseId/reject", adminCourseController.rejectCourse);

// ============================================================================
// COURSE OFFERINGS & SESSIONS
// ============================================================================

// Course Offerings
router.post(
  "/courses/:courseId/offerings",
  adminCourseController.createCourseOffering
);
router.get(
  "/courses/:courseId/offerings",
  adminCourseController.getCourseOfferings
);
router.put(
  "/offerings/:offeringId",
  adminCourseController.updateCourseOffering
);
router.delete(
  "/offerings/:offeringId",
  adminCourseController.deleteCourseOffering
);

// Course Sessions
router.post(
  "/courses/:courseId/sessions",
  adminCourseController.createCourseSession
);
router.get(
  "/courses/:courseId/sessions",
  adminCourseController.getCourseSessions
);
router.put(
  "/sessions/:sessionId",
  adminCourseController.updateCourseSession
);
router.delete(
  "/sessions/:sessionId",
  adminCourseController.deleteCourseSession
);

// ============================================================================
// IMPORTANT: This route must come LAST to avoid route conflicts
// Get course details by ID should be at the end
// ============================================================================

router.get("/courses/:courseId", adminCourseController.getCourseDetailsById);

module.exports = router;
