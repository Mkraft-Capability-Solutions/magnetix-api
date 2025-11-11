const { promisePool } = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class AdminInstructorService {
 async getAllInstructors() {
  const [rows] = await promisePool.query(`
    SELECT 
      instructors.*, 
      users.email,
       users.is_deleted,
      users.status
    FROM instructors
    JOIN users 
      ON instructors.user_id = users.uuid
  `);
  return rows;
}


  async getInstructorById(instructorId) {
    const [rows] = await promisePool.query(
      "SELECT * FROM instructors WHERE user_id = ?",
      [instructorId]
    );
    if (rows.length === 0) {
      throw new Error("Instructor not found");
    }
    return rows[0];
  }

  // Get instructor details with statistics
  async getInstructorWithStats(instructorId) {
    // Get basic instructor info with email
    const [instructorRows] = await promisePool.query(`
      SELECT
        i.*,
        u.email,
        u.is_deleted,
        u.status
      FROM instructors i
      JOIN users u ON i.user_id = u.uuid
      WHERE i.user_id = ?
    `, [instructorId]);

    if (instructorRows.length === 0) {
      throw new Error("Instructor not found");
    }

    const instructor = instructorRows[0];

    // Get total approved courses created by instructor
    const [courseStats] = await promisePool.query(`
      SELECT COUNT(*) as total_courses
      FROM course
      WHERE creator_id = ? AND is_deleted = 0 AND status = 'active'
    `, [instructorId]);

    // Get total events created by instructor
    const [eventStats] = await promisePool.query(`
      SELECT COUNT(*) as total_events
      FROM events
      WHERE creator_id = ? AND is_deleted = 0
    `, [instructorId]);

    // Get total 1:1 sessions conducted
    const [sessionStats] = await promisePool.query(`
      SELECT COUNT(*) as total_sessions
      FROM scheduled_sessions
      WHERE mentor_id = ? AND status = 'booked'
    `, [instructorId]);

    // Get total unique mentees
    const [menteeStats] = await promisePool.query(`
      SELECT COUNT(DISTINCT mentee_id) as total_mentees
      FROM scheduled_sessions
      WHERE mentor_id = ?
    `, [instructorId]);

    // Get batch information the instructor teaches (if applicable)
    const [batchInfo] = await promisePool.query(`
      SELECT GROUP_CONCAT(DISTINCT b.batch_name SEPARATOR ', ') as batches
      FROM course c
      LEFT JOIN course_batches cb ON c.id = cb.course_id
      LEFT JOIN batches b ON cb.batch_id = b.id
      WHERE c.creator_id = ? AND c.is_deleted = 0
    `, [instructorId]);

    return {
      ...instructor,
      statistics: {
        total_approved_courses: courseStats[0]?.total_courses || 0,
        total_events_created: eventStats[0]?.total_events || 0,
        total_sessions_conducted: sessionStats[0]?.total_sessions || 0,
        total_mentees: menteeStats[0]?.total_mentees || 0,
        batches: batchInfo[0]?.batches || 'N/A'
      }
    };
  }

  async createInstructor(data) {
    const { first_name, last_name, email } = data;

    if (!first_name || !email || !last_name) {
      throw new Error("Name and email are required");
    }

    // Generate UUID v4
    const uuid = uuidv4();

    // Generate a random password (8 chars, alphanumeric)
    const randomPassword = crypto.randomBytes(6).toString("base64");

    // First, insert into users table
    const [userResult] = await promisePool.query(
      `INSERT INTO users (uuid, email, password, role_id, instance, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, email, randomPassword, 2, "isms-lxp", "active"]
    );

    const userId = userResult.insertId;

    // Then insert into instructors table
    const [instructorResult] = await promisePool.query(
      `INSERT INTO instructors (user_id, first_name, last_name)
     VALUES (?, ?, ?)`,
      [uuid, first_name, last_name]
    );

    return {
      uuid,
      instructorId: instructorResult.insertId,
      generatedPassword: randomPassword,
    };
  }

  async updateInstructor(instructorId, data) {
    const { first_name, last_name, email } = data;
    await promisePool.query(
      "UPDATE instructors SET first_name = ?, last_name=? WHERE user_id = ?",
      [first_name, last_name, instructorId]
    );
    await promisePool.query("UPDATE users SET email = ? WHERE uuid = ?", [
      email,
      instructorId,
    ]);
    return true;
  }

  async deleteInstructor(instructorId) {
    await promisePool.query(
      "update users set is_deleted=1 WHERE uuid = ? and role_id=2",
      [instructorId]
    );
    return true;
  }

  // Featured Mentors functionality
  async getFeaturedMentors() {
    const [rows] = await promisePool.query(`
      SELECT
        instructors.*,
        users.email,
        users.is_deleted,
        users.status
      FROM instructors
      JOIN users
        ON instructors.user_id = users.uuid
      WHERE instructors.is_featured = 1
        AND users.is_deleted = 0
    `);
    return rows;
  }

  async addFeaturedMentor(instructorId) {
    const [result] = await promisePool.query(
      "UPDATE instructors SET is_featured = 1 WHERE user_id = ?",
      [instructorId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Instructor not found");
    }

    return true;
  }

  async removeFeaturedMentor(instructorId) {
    const [result] = await promisePool.query(
      "UPDATE instructors SET is_featured = 0 WHERE user_id = ?",
      [instructorId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Instructor not found");
    }

    return true;
  }
}
module.exports = new AdminInstructorService();