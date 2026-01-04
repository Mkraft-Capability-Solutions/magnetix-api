const certificatesService = require('../../services/student/certificates_service');

/**
 * Get verified (approved) certificates for student
 * GET /api/student/certificates/verified
 */
exports.getVerifiedCertificates = async (req, res, next) => {
  try {
    const response = await certificatesService.getCertificatesByStatus(
      req.user.uuid,
      'approved'
    );

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending certificates for student
 * GET /api/student/certificates/pending
 */
exports.getPendingCertificates = async (req, res, next) => {
  try {
    const response = await certificatesService.getCertificatesByStatus(
      req.user.uuid,
      'pending'
    );

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new certificate
 * POST /api/student/certificates
 */
exports.createCertificate = async (req, res, next) => {
  try {
    const {
      name,
      organization,
      issueDate,
      expiryDate,
      credentialId,
      certificateLink,
      issuedByOrg
    } = req.body;

    // Validation
    if (!name || !organization || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate name, organization, and issue date are required'
      });
    }

    // Get file path from request (if uploaded via upload endpoint)
    const filePath = req.body.filePath || null;
    const logoPath = req.body.logoPath || null;

    const certificateData = {
      name,
      organization,
      issueDate,
      expiryDate: expiryDate || null,
      credentialId: credentialId || null,
      certificateLink: certificateLink || null,
      issuedByOrg: issuedByOrg === 'true' || issuedByOrg === true
    };

    const response = await certificatesService.createCertificate(
      req.user.uuid,
      certificateData,
      filePath,
      logoPath
    );

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a certificate
 * DELETE /api/student/certificates/:id
 */
exports.deleteCertificate = async (req, res, next) => {
  try {
    const certificateId = req.params.id;

    if (!certificateId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required'
      });
    }

    const response = await certificatesService.deleteCertificate(
      req.user.uuid,
      certificateId
    );

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};
