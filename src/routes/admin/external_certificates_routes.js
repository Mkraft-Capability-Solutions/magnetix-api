const express = require('express');
const router = express.Router();
const externalCertificatesController = require('../../controllers/admin/external_certificates_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

// ============================================================================
// STATISTICS (Must be before :id routes)
// ============================================================================

// Get certificate statistics
router.get('/external-certificates/stats', externalCertificatesController.getStats);

// ============================================================================
// EXTERNAL CERTIFICATES MANAGEMENT
// ============================================================================

// Get all external certificates with filters
router.get('/external-certificates', externalCertificatesController.getAllExternalCertificates);

// Approve certificate
router.post('/external-certificates/:id/approve', externalCertificatesController.approveCertificate);

// Reject certificate
router.post('/external-certificates/:id/reject', externalCertificatesController.rejectCertificate);

module.exports = router;
