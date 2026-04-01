const express = require("express");
const router = express.Router();
const instructorCourseController = require("../../controllers/instructor/course_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(2, 3, 4)); // Role 2 = Instructor, Role 3 = Admin

// Course CRUD operations
router.post("/courses", instructorCourseController.addCourse);
router.put("/courses/:courseId", instructorCourseController.updateCourse);
router.delete("/courses/:courseId", instructorCourseController.deleteCourse);
// NOTE: getCourseDetailsById moved to bottom to avoid route conflicts
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
router.put(
  "/courses/:courseId/lessons/reorder",
  instructorCourseController.reorderLessons
);

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
router.get(
  "/courses/:courseId/lessons/:lessonId",
  instructorCourseController.getLessonById
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

// Add new category and subcategory
router.post("/metadata/categories", instructorCourseController.addCategory);
router.post("/metadata/subcategories", instructorCourseController.addSubCategory);

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

// Get batch assignments for a course
router.get(
  "/courses/:courseId/batches",
  instructorCourseController.getCourseBatches
);

// ============================================================================
// COURSE OFFERINGS & SESSIONS ROUTES
// ============================================================================

// Course Offerings
router.post(
  "/courses/:courseId/offerings",
  instructorCourseController.createCourseOffering
);
router.get(
  "/courses/:courseId/offerings",
  instructorCourseController.getCourseOfferings
);
router.put(
  "/offerings/:offeringId",
  instructorCourseController.updateCourseOffering
);
router.delete(
  "/offerings/:offeringId",
  instructorCourseController.deleteCourseOffering
);

// Course Sessions
router.post(
  "/courses/:courseId/sessions",
  instructorCourseController.createCourseSession
);
router.get(
  "/courses/:courseId/sessions",
  instructorCourseController.getCourseSessions
);
router.put(
  "/sessions/:sessionId",
  instructorCourseController.updateCourseSession
);
router.delete(
  "/sessions/:sessionId",
  instructorCourseController.deleteCourseSession
);

// ============================================================================
// INSTRUCTOR LEARNING ROUTES (Instructor as Learner)
// These routes allow instructors to browse, enroll, and save courses
// ============================================================================

// Get subscribed courses (My Courses)
router.get("/courses/subscribed", instructorCourseController.getSubscribedCourses);

// Get explore/browse courses
router.get("/courses/explore", instructorCourseController.exploreCourses);

// Get all active courses (regardless of enrollment or creator)
router.get("/courses/all-active", instructorCourseController.getAllActiveCourses);

// Get saved courses (Wishlist)
router.get("/courses/saved", instructorCourseController.getSavedCourses);

// Save course to wishlist
router.post("/courses/save", instructorCourseController.saveCourse);

// Unsave course from wishlist
router.post("/courses/unsave", instructorCourseController.unsaveCourse);

// Enroll in course
router.post("/courses/enroll", instructorCourseController.enrollInCourse);

// Update course status
router.patch("/courses/:courseId/status", instructorCourseController.updateCourseStatus);

// ============================================================================
// IMPORTANT: This route must come AFTER all specific /courses/* routes
// to avoid Express matching 'explore', 'subscribed', etc. as :courseId
// ============================================================================

// Get course details - uses learning-based stored procedures
router.get(
  "/courses/:courseId",
  instructorCourseController.getCourseDetailsForLearning
);

module.exports = router;
