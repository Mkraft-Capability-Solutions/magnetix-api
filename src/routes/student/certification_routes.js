const express = require("express");
const router = express.Router();
const certificationController = require("../../controllers/student/certification_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// Apply authentication and authorization middleware (Student role = 1)
router.use(authenticate);
router.use(authorize(1));

// ============================================================================
// STUDENT CERTIFICATION ENDPOINTS
// ============================================================================

// Get my certification enrollments with progress
router.get("/certifications/my-enrollments", certificationController.getMyCertificationEnrollments);

// Debug endpoints
router.get("/certifications/check-course/:courseId", certificationController.checkCertificationsForCourse);
router.post("/certifications/manual-auto-enroll", certificationController.manualAutoEnroll);

module.exports = router;
