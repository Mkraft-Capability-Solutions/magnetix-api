const express = require("express");
const router = express.Router();
const superAdminLessonController = require("../../controllers/super_admin/lesson_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(4)); // Role 4 = Super Admin only

// ============================================================================
// STANDALONE LESSON CRUD OPERATIONS
// ============================================================================

// Create a new standalone lesson
router.post("/lessons", superAdminLessonController.createStandaloneLesson);

// Get all standalone lessons
router.get("/lessons", superAdminLessonController.getStandaloneLessons);

// Get a specific standalone lesson
router.get("/lessons/:lessonId", superAdminLessonController.getStandaloneLessonById);

// Update a standalone lesson
router.put("/lessons/:lessonId", superAdminLessonController.updateStandaloneLesson);

// Delete a standalone lesson
router.delete("/lessons/:lessonId", superAdminLessonController.deleteStandaloneLesson);

module.exports = router;
