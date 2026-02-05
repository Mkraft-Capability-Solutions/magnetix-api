const externalCertificatesService = require('../../services/admin/external_certificates_service');

class ExternalCertificatesController {
  /**
   * Get all external certificates with filters
   * GET /api/admin/external-certificates?status=pending&page=1&limit=10&search=
   */
  async getAllExternalCertificates(req, res) {
    try {
      const {
        status = 'all',
        page = 1,
        limit = 10,
        search = ''
      } = req.query;

      const result = await externalCertificatesService.getAllExternalCertificates(
        status,
        parseInt(page),
        parseInt(limit),
        search
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(result.error?.status || 400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Internal server error',
          code: 'SERVER_ERROR'
        }
      });
    }
  }

  /**
   * Approve external certificate
   * POST /api/admin/external-certificates/:id/approve
   */
  async approveCertificate(req, res) {
    try {
      const { id } = req.params;

      const result = await externalCertificatesService.approveCertificate(parseInt(id));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(result.error?.status || 400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Internal server error',
          code: 'SERVER_ERROR'
        }
      });
    }
  }

  /**
   * Reject external certificate
   * POST /api/admin/external-certificates/:id/reject
   */
  async rejectCertificate(req, res) {
    try {
      const { id } = req.params;

      const result = await externalCertificatesService.rejectCertificate(parseInt(id));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(result.error?.status || 400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Internal server error',
          code: 'SERVER_ERROR'
        }
      });
    }
  }

  /**
   * Get certificate statistics
   * GET /api/admin/external-certificates/stats
   */
  async getStats(req, res) {
    try {
      const result = await externalCertificatesService.getCertificateStats();

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(result.error?.status || 400).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Internal server error',
          code: 'SERVER_ERROR'
        }
      });
    }
  }
}

module.exports = new ExternalCertificatesController();
