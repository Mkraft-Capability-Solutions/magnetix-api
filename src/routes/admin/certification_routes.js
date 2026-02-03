const express = require("express");
const router = express.Router();
const certificationController = require("../../controllers/admin/certification_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

// ============================================================================
// METADATA (ACTIVE COURSES FOR DROPDOWN) - Must be before :certificationId routes
// ============================================================================

// Get all active courses for dropdown
router.get("/certifications/metadata/active-courses", certificationController.getActiveCourses);

// ============================================================================
// LEARNER PROGRESS & TRACKING (Must be before :certificationId)
// ============================================================================

// Get learner progress (students working on certifications)
router.get("/certifications/learner-progress", certificationController.getLearnerProgress);

// ============================================================================
// EXPIRY & RENEWALS (Must be before :certificationId)
// ============================================================================

// Get expiring and expired certifications
router.get("/certifications/expiry-renewals", certificationController.getExpiryRenewals);

// ============================================================================
// ENROLLMENT MANAGEMENT (Must be before :certificationId)
// ============================================================================

// Enroll student in certification
router.post("/certifications/enroll", certificationController.enrollStudent);

// Auto-check certifications when course completed (system call)
router.post("/certifications/auto-check", certificationController.autoCheckCertifications);

// ============================================================================
// CERTIFICATION CRUD OPERATIONS
// ============================================================================

// Create new certification
router.post("/certifications", certificationController.createCertification);

// Get all certifications (with pagination and filters)
router.get("/certifications", certificationController.getAllCertifications);

// Get certification by ID (must be after metadata and specific routes)
router.get("/certifications/:certificationId", certificationController.getCertificationById);

// Update certification
router.put("/certifications/:certificationId", certificationController.updateCertification);

// Delete certification
router.delete("/certifications/:certificationId", certificationController.deleteCertification);

// ============================================================================
// CERTIFICATION STATUS
// ============================================================================

// Toggle certification status (active/inactive)
router.patch("/certifications/:certificationId/toggle-status", certificationController.toggleCertificationStatus);

// ============================================================================
// COURSE REQUIREMENTS
// ============================================================================

// Add course requirement to certification
router.post("/certifications/:certificationId/courses", certificationController.addCourseRequirement);

// Remove course requirement from certification
router.delete("/certifications/:certificationId/courses/:courseId", certificationController.removeCourseRequirement);

// Issue certificate to enrolled student (must be after :certificationId/courses)
router.post("/certifications/:enrollmentId/issue", certificationController.issueCertificate);

module.exports = router;
