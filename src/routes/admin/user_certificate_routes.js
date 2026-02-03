const express = require("express");
const router = express.Router();
const userCertificateController = require("../../controllers/admin/user_certificate_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

// ============================================================================
// METADATA & SEARCH ROUTES (Must be before :id routes)
// ============================================================================

// Get all certificate templates
router.get("/user-certificates/templates", userCertificateController.getCertificateTemplates);

// Search users for dropdown
router.get("/user-certificates/users/search", userCertificateController.searchUsers);

// ============================================================================
// CERTIFICATE CRUD OPERATIONS
// ============================================================================

// Issue certificate to user
router.post("/user-certificates", userCertificateController.issueCertificateToUser);

// Get all issued certificates (with pagination and filters)
router.get("/user-certificates", userCertificateController.getAllIssuedCertificates);

// Get certificate by ID
router.get("/user-certificates/:id", userCertificateController.getCertificateById);

// Delete certificate
router.delete("/user-certificates/:id", userCertificateController.deleteCertificate);

// Revoke certificate
router.patch("/user-certificates/:id/revoke", userCertificateController.revokeCertificate);

module.exports = router;
