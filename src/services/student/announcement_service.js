const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class AnnouncementService {
  /**
   * Get announcements for student from database
   */
  async getAnnouncements(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_announcements(?)', [studentId]);
      const announcements = result[0];

      return new ServiceResponseDTO(true, announcements, 'Announcements retrieved successfully');
    } catch (error) {
      return new ErrorResponseDTO({
        message: error.message || 'Failed to retrieve announcements',
        code: 'ANNOUNCEMENT_FETCH_ERROR'
      });
    }
  }
}

module.exports = new AnnouncementService();
