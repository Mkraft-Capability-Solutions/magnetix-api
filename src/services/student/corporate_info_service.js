const { promisePool } = require('../../config/db');

/**
 * Service for managing student corporate information
 */
class CorporateInfoService {
  /**
   * Get corporate information for a student
   * @param {string} userId - User UUID
   * @returns {Promise<Object|null>} Corporate info object or null if not found
   */
  async getCorporateInfo(userId) {
    const connection = await promisePool.getConnection();

    try {
      const [rows] = await connection.query(
        'CALL get_student_corporate_info(?)',
        [userId]
      );

      // Return null if no corporate info exists
      if (rows[0].length === 0) {
        return null;
      }

      return rows[0][0];
    } finally {
      connection.release();
    }
  }

  /**
   * Create or update corporate information for a student
   * @param {string} userId - User UUID
   * @param {Object} data - Corporate info data
   * @returns {Promise<Object>} Updated corporate info
   */
  async updateCorporateInfo(userId, data) {
    const connection = await promisePool.getConnection();

    try {
      const [rows] = await connection.query(
        'CALL upsert_student_corporate_info(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          data.job_profile || null,
          data.designation || null,
          data.department || null,
          data.employee_id || null,
          data.doj || null,
          data.organization_name || null,
          data.location || null,
          data.manager_name || null,
          data.manager_email || null,
          data.manager_contact || null
        ]
      );

      return rows[0][0];
    } finally {
      connection.release();
    }
  }

  /**
   * Delete corporate information for a student
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Result with deleted_rows count
   */
  async deleteCorporateInfo(userId) {
    const connection = await promisePool.getConnection();

    try {
      const [rows] = await connection.query(
        'CALL delete_student_corporate_info(?)',
        [userId]
      );

      return {
        success: true,
        deletedRows: rows[0][0].deleted_rows
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new CorporateInfoService();
