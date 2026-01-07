const express = require("express");
const router = express.Router();

const adminSessionController = require("../../controllers/admin/session_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// All routes require authentication and admin authorization
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

// Get all sessions with optional filters
router.get("/", adminSessionController.getAllSessions);

// Get sessions by status (must come before /:id route)
router.get("/pending", adminSessionController.getPendingSessions);
router.get("/booked", adminSessionController.getBookedSessions);
router.get("/rejected", adminSessionController.getRejectedSessions);
router.get("/cancelled", adminSessionController.getCancelledSessions);
router.get("/past", adminSessionController.getPastSessions);

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

// Cancel a session
router.put("/:sessionId/cancel", adminSessionController.cancelSession);

// Delete a session
router.delete("/:sessionId", adminSessionController.deleteSession);

module.exports = router;
