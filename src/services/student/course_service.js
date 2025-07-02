const { promisePool } = require('../../config/db');
const { CourseDTO, CourseRatingDTO } = require('../../dto/course_dto');

class CourseService {
  // Get all courses the student is enrolled in
  async getSubscribedCourses(studentId) {
    const [rows] = await promisePool.query(`
      SELECT 
        c.*, 
        CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
        i.dp as instructor_image,
        e.enrolled_date,
        1 as is_enrolled
      FROM enrol e
      JOIN course c ON e.course_id = c.id
      JOIN instructors i ON c.creator_id = i.user_id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_date DESC
    `, [studentId]);

    return rows.map(course => new CourseDTO(course));
  }

  // Get all active courses not enrolled by student
  async exploreCourses(studentId) {
    const [rows] = await promisePool.query(`
      SELECT 
        c.*, 
        CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
        i.dp as instructor_image,
        (SELECT AVG(rating) FROM course_rating WHERE course_id = c.id) as avg_rating,
        0 as is_enrolled
      FROM course c
      JOIN instructors i ON c.creator_id = i.user_id
      WHERE c.status = 'active'
      AND c.id NOT IN (
        SELECT course_id FROM enrol WHERE user_id = ?
      )
      ORDER BY c.created_at DESC
    `, [studentId]);

    return rows.map(course => new CourseDTO(course));
  }

  // Get course ratings and reviews
  async getCourseRatings(courseId) {
    const [rows] = await promisePool.query(`
      SELECT 
        cr.*,
        CONCAT(s.first_name, ' ', s.last_name) as user_name,
        s.dp as user_image
      FROM course_rating cr
      JOIN students s ON cr.user_id = s.user_id
      WHERE cr.course_id = ?
      ORDER BY cr.date_added DESC
    `, [courseId]);

    return rows.map(rating => new CourseRatingDTO(rating));
  }

  // Enroll student in a course
  async enrollInCourse(studentId, courseId) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if already enrolled
      const [existing] = await connection.query(
        'SELECT * FROM enrol WHERE user_id = ? AND course_id = ?',
        [studentId, courseId]
      );

      if (existing.length > 0) {
        throw new Error('Already enrolled in this course');
      }

      // Check if course exists and is active
      const [course] = await connection.query(
        `SELECT 
          c.id, 
          c.title, 
          c.thumbnail,
          CONCAT(i.first_name, ' ', i.last_name) as instructor_name
         FROM course c
         JOIN instructors i ON c.creator_id = i.user_id
         WHERE c.id = ? AND c.status = "active"`,
        [courseId]
      );

      if (course.length === 0) {
        throw new Error('Course not available for enrollment');
      }

      // Enroll the student
      await connection.query(
        'INSERT INTO enrol (user_id, course_id) VALUES (?, ?)',
        [studentId, courseId]
      );

      await connection.commit();

      return new CourseDTO({
        ...course[0],
        is_enrolled: true,
        enrollment_date: new Date().toISOString()
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new CourseService();