const express = require("express");
const router = express.Router();
const adminCourseController = require("../../controllers/admin/course_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

// ============================================================================
// COURSE CRUD OPERATIONS
// ============================================================================

router.post("/", adminCourseController.addCourse);
router.put("/:courseId", adminCourseController.updateCourse);
router.delete("/:courseId", adminCourseController.deleteCourse);

// ============================================================================
// COURSE UPDATE OPERATIONS (Requirements, Outcomes, FAQs, Meta)
// ============================================================================

router.put(
  "/:courseId/requirements",
  adminCourseController.addCourseRequirements
);
router.put(
  "/:courseId/outcomes",
  adminCourseController.addCourseOutcomes
);
router.put(
  "/:courseId/faqs",
  adminCourseController.addCourseFAQs
);
router.put(
  "/:courseId/meta",
  adminCourseController.updateMetaKeywords
);

// ============================================================================
// SECTIONS AND LESSONS
// ============================================================================

router.post(
  "/:courseId/sections",
  adminCourseController.addSection
);
router.get(
  "/:courseId/sections",
  adminCourseController.getSectionsByCourseId
);
router.post(
  "/:courseId/lessons",
  adminCourseController.addLesson
);
router.put(
  "/:courseId/lessons/:lessonId",
  adminCourseController.updateLesson
);
router.delete(
  "/:courseId/lessons/:lessonId",
  adminCourseController.deleteLesson
);
router.get(
  "/:courseId/lessons/:lessonId",
  adminCourseController.getLessonById
);

// ============================================================================
// INDIVIDUAL SECTION UPDATE ENDPOINTS (for editing)
// ============================================================================

router.put(
  "/:courseId/basic",
  adminCourseController.updateCourseBasicInfo
);
router.put(
  "/:courseId/details",
  adminCourseController.updateCourseDetails
);
router.put(
  "/:courseId/media",
  adminCourseController.updateCourseMedia
);

// ============================================================================
// GET COURSES (Admin-specific - all courses)
// ============================================================================

router.get(
  "/admin/active",
  adminCourseController.getAdminActiveCourses
);
router.get(
  "/admin/pending",
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
  "/:courseId/students",
  adminCourseController.getEnrolledStudents
);
router.get(
  "/:courseId/enrollments/progress",
  adminCourseController.getEnrolledStudentsWithProgress
);
router.get(
  "/:courseId/analytics",
  adminCourseController.getCourseAnalytics
);
router.get(
  "/:courseId/batches",
  adminCourseController.getCourseBatches
);

// ============================================================================
// ADMIN-SPECIFIC OPERATIONS
// ============================================================================

router.patch("/:courseId/approve", adminCourseController.approveCourse);
router.patch("/:courseId/reject", adminCourseController.rejectCourse);

// ============================================================================
// COURSE OFFERINGS & SESSIONS
// ============================================================================

// Course Offerings
router.post(
  "/:courseId/offerings",
  adminCourseController.createCourseOffering
);
router.get(
  "/:courseId/offerings",
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
  "/:courseId/sessions",
  adminCourseController.createCourseSession
);
router.get(
  "/:courseId/sessions",
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

router.get("/:courseId", adminCourseController.getCourseDetailsById);

module.exports = router;
