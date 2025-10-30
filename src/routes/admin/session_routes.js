const express = require("express");
const router = express.Router();

const adminSessionController = require("../../controllers/admin/session_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// All routes require authentication and admin authorization
router.use(authenticate);
router.use(authorize(3)); // Role ID 3 = Admin

// Get all sessions with optional filters
router.get("/", adminSessionController.getAllSessions);

// Get session statistics
router.get("/stats", adminSessionController.getSessionStats);

// Get available instructors for a specific date/time
router.get("/available-instructors", adminSessionController.getAvailableInstructors);

// Get all instructors with availability info
router.get("/instructors", adminSessionController.getAllInstructors);

// Get a specific session by ID
router.get("/:id", adminSessionController.getSessionById);

// Schedule a new session
router.post("/schedule", adminSessionController.scheduleSession);

// Update an existing session
router.put("/update", adminSessionController.updateSession);

// Cancel/Delete a session
router.delete("/cancel", adminSessionController.deleteSession);

module.exports = router;
