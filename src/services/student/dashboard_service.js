const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class DashboardService {
  /**
   * Get dashboard statistics for student
   */
  async getDashboardStats(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_dashboard_stats(?)', [studentId]);
      const stats = result[0][0];

      return new ServiceResponseDTO(true, stats, 'Dashboard stats retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve dashboard stats',
        code: 'DASHBOARD_STATS_ERROR'
      });
    }
  }
}

module.exports = new DashboardService();
