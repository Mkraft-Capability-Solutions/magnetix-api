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

    // Get approved courses list with details
    const [coursesList] = await promisePool.query(`
      SELECT
        c.id,
        c.title,
        c.level,
        c.status,
        c.created_at,
        c.thumbnail,
        COUNT(DISTINCT e.id) as enrolled_count
      FROM course c
      LEFT JOIN enrol e ON c.id = e.course_id
      WHERE c.creator_id = ? AND c.is_deleted = 0 AND c.status = 'active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [instructorId]);

    // Get events list with details
    const [eventsList] = await promisePool.query(`
      SELECT
        ev.id,
        ev.title,
        ev.start_date,
        ev.end_date,
        ev.online_event,
        COUNT(DISTINCT ea.id) as attendees_count
      FROM events ev
      LEFT JOIN event_attendees ea ON ev.id = ea.event_id
      WHERE ev.creator_id = ? AND ev.is_deleted = 0
      GROUP BY ev.id
      ORDER BY ev.start_date DESC
    `, [instructorId]);

    // Get 1:1 sessions list with mentee details
    const [sessionsList] = await promisePool.query(`
      SELECT
        ss.id,
        ss.topic,
        ss.session_date,
        ss.session_time,
        ss.duration,
        ss.status,
        ss.url,
        s.first_name as mentee_first_name,
        s.last_name as mentee_last_name,
        u.email as mentee_email
      FROM scheduled_sessions ss
      JOIN students s ON ss.mentee_id = s.user_id
      JOIN users u ON s.user_id = u.uuid
      WHERE ss.mentor_id = ?
      ORDER BY ss.session_date DESC, ss.session_time DESC
    `, [instructorId]);

    // Get unique mentees list with details
    const [menteesList] = await promisePool.query(`
      SELECT DISTINCT
        s.user_id,
        s.first_name,
        s.last_name,
        s.specialization,
        u.email,
        b.batch_name,
        COUNT(DISTINCT ss.id) as total_sessions
      FROM scheduled_sessions ss
      JOIN students s ON ss.mentee_id = s.user_id
      JOIN users u ON s.user_id = u.uuid
      LEFT JOIN batches b ON s.batch_id = b.id
      WHERE ss.mentor_id = ?
      GROUP BY s.user_id
      ORDER BY total_sessions DESC
    `, [instructorId]);

    // Get instructor availability
    const [availability] = await promisePool.query(`
      SELECT
        available_days,
        start_time,
        end_time,
        timezone,
        is_active
      FROM instructor_availability
      WHERE instructor_uuid = ?
    `, [instructorId]);

    return {
      ...instructor,
      statistics: {
        total_approved_courses: coursesList.length,
        total_events_created: eventsList.length,
        total_sessions_conducted: sessionsList.length,
        total_mentees: menteesList.length,
        courses: coursesList,
        events: eventsList,
        sessions: sessionsList,
        mentees: menteesList
      },
      availability: availability[0] || null
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