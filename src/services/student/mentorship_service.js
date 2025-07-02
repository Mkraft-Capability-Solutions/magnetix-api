const { promisePool } = require('../../config/db');
const { MentorDTO, MentorshipSessionDTO } = require('../../dto/mentorship_dto');

class MentorshipService {
  // Get assigned mentors
  async getYourMentor(studentId) {
    const [rows] = await promisePool.query(`
      SELECT m.*, 
        i.user_id,
        CONCAT(i.first_name, ' ', i.last_name) as mentor_name,
        i.dp as mentor_image,
        i.about as mentor_bio,
        i.contact,
        i.gender,
        i.social_links,
        (SELECT AVG(cr.rating) 
         FROM course_rating cr 
         JOIN course c ON cr.course_id = c.id 
         WHERE c.creator_id = i.user_id) as avg_rating
      FROM mentorship m
      JOIN instructors i ON m.mentorId = i.user_id
      WHERE m.menteeId = ? AND m.status = 1
    `, [studentId]);

    return rows.map(mentor => new MentorDTO({
      ...mentor,
      status: 1 // Active mentorship status
    }));
  }

  // Find available mentors not already assigned
  async findYourMentors(studentId) {
    const [rows] = await promisePool.query(`
      SELECT 
        i.user_id,
        i.first_name,
        i.last_name,
        i.dp,
        i.about as bio,
        i.contact,
        i.gender,
        i.social_links,
        (SELECT AVG(cr.rating) 
         FROM course_rating cr 
         JOIN course c ON cr.course_id = c.id 
         WHERE c.creator_id = i.user_id) as avg_rating
      FROM instructors i
      WHERE i.user_id NOT IN (
        SELECT mentorId FROM mentorship WHERE menteeId = ?
      )
    `, [studentId]);

    return rows.map(mentor => new MentorDTO(mentor));
  }

  // Request mentorship
  async requestMentorship(studentId, mentorId) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if request already exists
      const [existing] = await connection.query(
        'SELECT * FROM mentorship WHERE menteeId = ? AND mentorId = ?',
        [studentId, mentorId]
      );

      if (existing.length > 0) {
        throw new Error('Mentorship request already exists');
      }

      // Create new request
      await connection.query(
        'INSERT INTO mentorship (menteeId, mentorId, status) VALUES (?, ?, 0)',
        [studentId, mentorId]
      );

      await connection.commit();
      return { success: true, message: 'Mentorship request sent successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new MentorshipService();