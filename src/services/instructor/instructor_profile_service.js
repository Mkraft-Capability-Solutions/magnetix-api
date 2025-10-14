const { promisePool } = require('../../config/db');
const { InstructorProfileDTO } = require('../../dto/instructor/instructor_profile_dto');

/**
 * Service for instructor profile operations
 */
class InstructorProfileService {
  /**
   * Get complete instructor profile with all related data
   * @param {string} instructorUuid - UUID of the instructor
   * @returns {Promise<InstructorProfileDTO>}
   */
  async getCompleteProfile(instructorUuid) {
    try {
      // Call stored procedure that returns multiple result sets
      const [results] = await promisePool.query(
        'CALL get_instructor_complete_profile(?)',
        [instructorUuid]
      );

      // The stored procedure returns 5 result sets:
      // [0] - Basic instructor info with stats
      // [1] - Latest courses
      // [2] - Latest events
      // [3] - Latest reviews
      // [4] - Availability

      const [profileData] = results[0] || [];
      const courses = results[1] || [];
      const events = results[2] || [];
      const reviews = results[3] || [];
      const [availability] = results[4] || [];

      if (!profileData) {
        throw new Error('Instructor profile not found');
      }

      // Create DTO
      const profileDTO = new InstructorProfileDTO(
        profileData,
        courses,
        events,
        reviews,
        availability
      );

      return profileDTO;
    } catch (error) {
      console.error('Error in getCompleteProfile:', error);
      throw error;
    }
  }

  /**
   * Update instructor experience
   * @param {string} instructorUuid - UUID of the instructor
   * @param {Array} experience - Array of experience objects
   * @returns {Promise<boolean>}
   */
  async updateExperience(instructorUuid, experience) {
    try {
      // Validate experience format
      if (!Array.isArray(experience)) {
        throw new Error('Experience must be an array');
      }

      // Convert experience array to JSON string
      const experienceJson = JSON.stringify(experience);

      // Update instructor experience
      const [result] = await promisePool.query(
        'UPDATE instructors SET experience = ? WHERE user_id = ?',
        [experienceJson, instructorUuid]
      );

      if (result.affectedRows === 0) {
        throw new Error('Instructor not found or no changes made');
      }

      return true;
    } catch (error) {
      console.error('Error in updateExperience:', error);
      throw error;
    }
  }

  /**
   * Get instructor basic info (for lightweight queries)
   * @param {string} instructorUuid - UUID of the instructor
   * @returns {Promise<Object>}
   */
  async getBasicInfo(instructorUuid) {
    try {
      const [rows] = await promisePool.query(
        `SELECT
          i.id,
          i.user_id AS instructor_uuid,
          i.first_name,
          i.last_name,
          CONCAT(i.first_name, ' ', i.last_name) AS full_name,
          i.dp,
          i.expertise,
          i.about,
          COALESCE(ROUND(AVG(ir.rating), 1), 0) AS average_rating,
          COUNT(DISTINCT ir.id) AS total_reviews
        FROM instructors i
        LEFT JOIN instructor_ratings ir ON i.user_id = ir.instructor_uuid AND ir.is_deleted = 0
        WHERE i.user_id = ?
        GROUP BY i.id, i.user_id, i.first_name, i.last_name, i.dp, i.expertise, i.about`,
        [instructorUuid]
      );

      if (rows.length === 0) {
        throw new Error('Instructor not found');
      }

      return rows[0];
    } catch (error) {
      console.error('Error in getBasicInfo:', error);
      throw error;
    }
  }
}

module.exports = new InstructorProfileService();
