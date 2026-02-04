const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');
const achievementsService = require('./achievements_service');
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

      // Award points if certificate was approved
      if (status === 'approved' && certificate.user_id) {
        await achievementsService.awardPoints(
          certificate.user_id,
          150,
          75,
          'certificate_approved',
          'certificate',
          certificateId,
          `Certificate approved: ${certificate.certificate_name || 'External Certificate'}`
        );
      }

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

  /**
   * Get issued certificates for a student (both course-based and admin-issued)
   */
  async getIssuedCertificates(userId) {
    const connection = await promisePool.getConnection();
    try {
      // Get admin-issued certificates for this student
      const [adminCertificates] = await connection.query(
        `SELECT
          aic.id,
          aic.certificate_number,
          aic.certificate_name as name,
          aic.description,
          aic.issue_date as issueDate,
          aic.expiry_date as expiryDate,
          aic.status,
          ct.template_name,
          CONCAT(COALESCE(issuer_s.first_name, issuer_i.first_name, issuer_a.first_name), ' ',
                 COALESCE(issuer_s.last_name, issuer_i.last_name, issuer_a.last_name)) as issuedBy,
          'admin-issued' as certificate_type
         FROM admin_issued_certificates aic
         LEFT JOIN certificate_templates ct ON aic.template_id = ct.id
         LEFT JOIN users issuer ON aic.issued_by = issuer.uuid
         LEFT JOIN students issuer_s ON issuer.uuid = issuer_s.user_id AND issuer.role_id = 1
         LEFT JOIN instructors issuer_i ON issuer.uuid = issuer_i.user_id AND issuer.role_id = 2
         LEFT JOIN admins issuer_a ON issuer.uuid = issuer_a.user_id AND issuer.role_id IN (3, 4)
         WHERE aic.user_id = ? AND aic.status = 'active'
         ORDER BY aic.issue_date DESC`,
        [userId]
      );

      // Get course-based certificates (from certification completions)
      const [courseCertificates] = await connection.query(
        `SELECT
          sce.id,
          CONCAT('CERT-', sce.certification_id, '-', sce.id) as certificate_number,
          c.certification_name as name,
          c.description,
          sce.certificate_issued_date as issueDate,
          CASE
            WHEN c.validity_type = 'limited' AND sce.certificate_issued_date IS NOT NULL
            THEN DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY)
            ELSE NULL
          END as expiryDate,
          'active' as status,
          c.template_file_path as template_name,
          'System' as issuedBy,
          'course-based' as certificate_type,
          c.validity_type,
          c.validity_period,
          sce.certificate_file_path,
          (SELECT COUNT(DISTINCT course_id)
           FROM certification_course_requirements
           WHERE certification_id = c.id) as courses_completed
         FROM student_certification_enrollments sce
         INNER JOIN certifications c ON sce.certification_id = c.id
         WHERE sce.user_id = ? AND sce.status = 'completed' AND sce.certificate_issued_date IS NOT NULL
         ORDER BY sce.certificate_issued_date DESC`,
        [userId]
      );

      // Combine both types of certificates
      const allCertificates = [
        ...adminCertificates,
        ...courseCertificates
      ];

      // Sort by issue date (most recent first)
      allCertificates.sort((a, b) => {
        const dateA = new Date(a.issueDate);
        const dateB = new Date(b.issueDate);
        return dateB - dateA;
      });

      connection.release();

      return new ServiceResponseDTO(
        true,
        allCertificates,
        'Issued certificates retrieved successfully'
      );
    } catch (error) {
      connection.release();
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve issued certificates',
        code: 'ISSUED_CERTIFICATES_FETCH_ERROR'
      });
    }
  }

  /**
   * Get specific issued certificate details by ID
   */
  async getIssuedCertificateById(userId, certificateId) {
    const connection = await promisePool.getConnection();
    try {
      // First try admin-issued certificates
      const [adminCertificates] = await connection.query(
        `SELECT
          aic.id,
          aic.certificate_number,
          aic.certificate_name,
          aic.description,
          aic.issue_date,
          aic.expiry_date,
          aic.status,
          aic.created_at,
          u.email,
          COALESCE(s.first_name, i.first_name) as first_name,
          COALESCE(s.last_name, i.last_name) as last_name,
          ct.template_name,
          CONCAT(COALESCE(issuer_s.first_name, issuer_i.first_name, issuer_a.first_name), ' ',
                 COALESCE(issuer_s.last_name, issuer_i.last_name, issuer_a.last_name)) as issued_by_name,
          'admin-issued' as certificate_type
         FROM admin_issued_certificates aic
         LEFT JOIN users u ON aic.user_id = u.uuid
         LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
         LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 2
         LEFT JOIN certificate_templates ct ON aic.template_id = ct.id
         LEFT JOIN users issuer ON aic.issued_by = issuer.uuid
         LEFT JOIN students issuer_s ON issuer.uuid = issuer_s.user_id AND issuer.role_id = 1
         LEFT JOIN instructors issuer_i ON issuer.uuid = issuer_i.user_id AND issuer.role_id = 2
         LEFT JOIN admins issuer_a ON issuer.uuid = issuer_a.user_id AND issuer.role_id IN (3, 4)
         WHERE aic.id = ? AND aic.user_id = ? AND aic.status = 'active'`,
        [certificateId, userId]
      );

      if (adminCertificates.length > 0) {
        connection.release();
        return new ServiceResponseDTO(
          true,
          adminCertificates[0],
          'Certificate details retrieved successfully'
        );
      }

      // If not found in admin-issued, try course-based certificates
      const [courseCertificates] = await connection.query(
        `SELECT
          sce.id,
          CONCAT('CERT-', sce.certification_id, '-', sce.id) as certificate_number,
          c.certification_name as certificate_name,
          c.description,
          sce.certificate_issued_date as issue_date,
          CASE
            WHEN c.validity_type = 'limited' AND sce.certificate_issued_date IS NOT NULL
            THEN DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY)
            ELSE NULL
          END as expiry_date,
          'active' as status,
          sce.completion_date as created_at,
          u.email,
          s.first_name,
          s.last_name,
          c.template_file_path as template_name,
          'System' as issued_by_name,
          'course-based' as certificate_type,
          sce.certificate_file_path,
          (SELECT COUNT(DISTINCT course_id)
           FROM certification_course_requirements
           WHERE certification_id = c.id) as courses_completed
         FROM student_certification_enrollments sce
         INNER JOIN certifications c ON sce.certification_id = c.id
         INNER JOIN users u ON sce.user_id COLLATE utf8mb4_general_ci = u.uuid COLLATE utf8mb4_general_ci
         INNER JOIN students s ON u.uuid COLLATE utf8mb4_general_ci = s.user_id COLLATE utf8mb4_general_ci
         WHERE sce.id = ? AND sce.user_id COLLATE utf8mb4_general_ci = ? COLLATE utf8mb4_general_ci AND sce.status = 'completed' AND sce.certificate_issued_date IS NOT NULL`,
        [certificateId, userId]
      );

      connection.release();

      if (courseCertificates.length === 0) {
        return new ErrorResponseDTO({
          message: 'Certificate not found or you do not have access to it',
          code: 'CERTIFICATE_NOT_FOUND',
          status: 404
        });
      }

      return new ServiceResponseDTO(
        true,
        courseCertificates[0],
        'Certificate details retrieved successfully'
      );
    } catch (error) {
      connection.release();
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve certificate details',
        code: 'CERTIFICATE_FETCH_ERROR'
      });
    }
  }
}

module.exports = new CertificatesService();
