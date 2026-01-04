const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');
const fs = require('fs').promises;
const path = require('path');

class CertificatesService {
  /**
   * Get certificates by status for a user
   */
  async getCertificatesByStatus(userId, status) {
    try {
      const [result] = await promisePool.query(
        'CALL get_student_certificates(?, ?)',
        [userId, status]
      );
      const certificates = result[0];

      return new ServiceResponseDTO(
        true,
        certificates,
        `${status.charAt(0).toUpperCase() + status.slice(1)} certificates retrieved successfully`
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || `Failed to retrieve ${status} certificates`,
        code: 'CERTIFICATES_FETCH_ERROR'
      });
    }
  }

  /**
   * Create a new certificate
   */
  async createCertificate(userId, certificateData, filePath = null, logoPath = null) {
    try {
      const {
        name,
        organization,
        issueDate,
        expiryDate = null,
        credentialId = null,
        certificateLink = null,
        issuedByOrg = false
      } = certificateData;

      const [result] = await promisePool.query(
        'CALL create_certificate(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          name,
          organization,
          issueDate,
          expiryDate,
          credentialId,
          certificateLink,
          filePath,
          logoPath,
          issuedByOrg
        ]
      );

      const certificate = result[0][0];

      return new ServiceResponseDTO(
        true,
        certificate,
        'Certificate created successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to create certificate',
        code: 'CERTIFICATE_CREATE_ERROR'
      });
    }
  }

  /**
   * Delete a certificate (with file cleanup)
   */
  async deleteCertificate(userId, certificateId) {
    try {
      const [result] = await promisePool.query(
        'CALL delete_certificate(?, ?)',
        [certificateId, userId]
      );

      // Get file path for cleanup
      const fileInfo = result[0][0];

      // Delete physical file if exists
      if (fileInfo && fileInfo.file_path) {
        try {
          const filePath = path.join(__dirname, '../../../uploads', fileInfo.file_path);
          await fs.unlink(filePath);
          console.log(`[CertificatesService] Deleted file: ${filePath}`);
        } catch (fileError) {
          console.error('[CertificatesService] File deletion error:', fileError.message);
          // Continue even if file deletion fails
        }
      }

      return new ServiceResponseDTO(
        true,
        null,
        'Certificate deleted successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to delete certificate',
        code: 'CERTIFICATE_DELETE_ERROR'
      });
    }
  }

  /**
   * Update certificate status (Admin only - for future use)
   */
  async updateCertificateStatus(certificateId, status) {
    try {
      const [result] = await promisePool.query(
        'CALL update_certificate_status(?, ?)',
        [certificateId, status]
      );

      const certificate = result[0][0];

      return new ServiceResponseDTO(
        true,
        certificate,
        `Certificate ${status} successfully`
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to update certificate status',
        code: 'CERTIFICATE_UPDATE_ERROR'
      });
    }
  }
}

module.exports = new CertificatesService();
