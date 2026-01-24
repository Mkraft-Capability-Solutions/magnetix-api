const express = require("express");
const router = express.Router();
const adminLessonController = require("../../controllers/admin/lesson_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

// ============================================================================
// STANDALONE LESSON CRUD OPERATIONS
// ============================================================================

// Create a new standalone lesson
router.post("/lessons", adminLessonController.createStandaloneLesson);

// Get all standalone lessons
router.get("/lessons", adminLessonController.getStandaloneLessons);

// Get a specific standalone lesson
router.get("/lessons/:lessonId", adminLessonController.getStandaloneLessonById);

// Update a standalone lesson
router.put("/lessons/:lessonId", adminLessonController.updateStandaloneLesson);

// Delete a standalone lesson
router.delete("/lessons/:lessonId", adminLessonController.deleteStandaloneLesson);

module.exports = router;
