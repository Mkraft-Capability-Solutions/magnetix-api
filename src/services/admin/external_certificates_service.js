const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');
const achievementsService = require('../student/achievements_service');
const notificationService = require('../notification_service');

class ExternalCertificatesService {
  /**
   * Get all external certificates by status (for admin)
   */
  async getAllExternalCertificates(status = 'all', page = 1, limit = 10, search = '') {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '1=1';
      const params = [];

      // Filter by status
      if (status !== 'all') {
        whereClause += ' AND sc.status = ?';
        params.push(status);
      }

      // Search filter
      if (search) {
        whereClause += ` AND (
          sc.certificate_name LIKE ? OR
          sc.organization LIKE ? OR
          CONCAT(s.first_name, ' ', s.last_name) LIKE ? OR
          u.email LIKE ?
        )`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      // Get total count
      const [countResult] = await promisePool.query(
        `SELECT COUNT(*) as total
         FROM student_certificates sc
         INNER JOIN users u ON sc.user_id = u.uuid
         INNER JOIN students s ON u.uuid = s.user_id
         WHERE ${whereClause}`,
        params
      );

      const total = countResult[0].total;

      // Get certificates with pagination
      const [certificates] = await promisePool.query(
        `SELECT
          sc.id,
          sc.user_id,
          sc.certificate_name,
          sc.organization as issuing_organization,
          sc.issue_date,
          sc.expiry_date,
          sc.credential_id,
          sc.certificate_link,
          sc.file_path,
          sc.logo_path,
          sc.issued_by_org,
          sc.status,
          sc.created_at,
          s.first_name,
          s.last_name,
          u.email
         FROM student_certificates sc
         INNER JOIN users u ON sc.user_id = u.uuid
         INNER JOIN students s ON u.uuid = s.user_id
         WHERE ${whereClause}
         ORDER BY sc.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return new ServiceResponseDTO(
        true,
        {
          data: certificates,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        'External certificates retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve external certificates',
        code: 'EXTERNAL_CERTIFICATES_FETCH_ERROR'
      });
    }
  }

  /**
   * Approve external certificate
   */
  async approveCertificate(certificateId) {
    try {
      const [result] = await promisePool.query(
        'CALL update_certificate_status(?, ?)',
        [certificateId, 'approved']
      );

      const certificate = result[0][0];

      // Award points if certificate was approved
      if (certificate && certificate.user_id) {
        await achievementsService.awardPoints(
          certificate.user_id,
          150,
          75,
          'certificate_approved',
          'certificate',
          certificateId,
          `External certificate approved: ${certificate.certificate_name || 'Certificate'}`
        );

        // Send notification to user
        try {
          await notificationService.createNotification({
            title: 'Certificate Approved',
            message: `Congratulations! Your certificate "${certificate.certificate_name}" has been approved and 150 XP & 75 coins have been awarded.`,
            notification_type: 'system',
            icon: 'check-circle',
            recipient_id: certificate.user_id,
            delivery_method: 'in-app',
            metadata: JSON.stringify({
              certificate_id: certificateId,
              certificate_name: certificate.certificate_name,
              action: 'approved',
              xp_awarded: 150,
              coins_awarded: 75
            })
          });
        } catch (notifError) {
          console.error('Failed to send approval notification:', notifError);
          // Don't fail the approval if notification fails
        }
      }

      return new ServiceResponseDTO(
        true,
        certificate,
        'Certificate approved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to approve certificate',
        code: 'CERTIFICATE_APPROVE_ERROR'
      });
    }
  }

  /**
   * Reject external certificate
   */
  async rejectCertificate(certificateId) {
    try {
      const [result] = await promisePool.query(
        'CALL update_certificate_status(?, ?)',
        [certificateId, 'rejected']
      );

      const certificate = result[0][0];

      // Send notification to user
      if (certificate && certificate.user_id) {
        try {
          await notificationService.createNotification({
            title: 'Certificate Rejected',
            message: `Your certificate "${certificate.certificate_name}" has been reviewed and could not be approved at this time. Please ensure the certificate details are correct and try again.`,
            notification_type: 'system',
            icon: 'x-circle',
            recipient_id: certificate.user_id,
            delivery_method: 'in-app',
            metadata: JSON.stringify({
              certificate_id: certificateId,
              certificate_name: certificate.certificate_name,
              action: 'rejected'
            })
          });
        } catch (notifError) {
          console.error('Failed to send rejection notification:', notifError);
          // Don't fail the rejection if notification fails
        }
      }

      return new ServiceResponseDTO(
        true,
        certificate,
        'Certificate rejected successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to reject certificate',
        code: 'CERTIFICATE_REJECT_ERROR'
      });
    }
  }

  /**
   * Get certificate statistics
   */
  async getCertificateStats() {
    try {
      const [stats] = await promisePool.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
         FROM student_certificates`
      );

      return new ServiceResponseDTO(
        true,
        stats[0],
        'Certificate statistics retrieved successfully'
      );
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve statistics',
        code: 'STATS_FETCH_ERROR'
      });
    }
  }
}

module.exports = new ExternalCertificatesService();
