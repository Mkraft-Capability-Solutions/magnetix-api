const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const certificatesController = require('../../controllers/student/certificates_controller');

/**
 * Get verified (approved) certificates for authenticated student
 * GET /api/student/certificates/verified
 */
router.get('/verified', authenticate, authorize(1), certificatesController.getVerifiedCertificates);

/**
 * Get pending certificates for authenticated student
 * GET /api/student/certificates/pending
 */
router.get('/pending', authenticate, authorize(1), certificatesController.getPendingCertificates);

/**
 * Create a new certificate
 * POST /api/student/certificates
 */
router.post('/', authenticate, authorize(1), certificatesController.createCertificate);

/**
 * Delete a certificate
 * DELETE /api/student/certificates/:id
 */
router.delete('/:id', authenticate, authorize(1), certificatesController.deleteCertificate);

module.exports = router;
