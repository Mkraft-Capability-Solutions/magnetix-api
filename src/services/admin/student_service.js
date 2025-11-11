const { promisePool } = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class AdminStudentService {
async getAllStudents() {
  const [rows] = await promisePool.query(`
    SELECT
      students.*,
      users.email,
      users.is_deleted,
      users.status,
      batches.batch_name
    FROM students
    JOIN users
      ON students.user_id = users.uuid
    LEFT JOIN batches
      ON students.batch_id = batches.id
  `);
  return rows;
}

  async getStudentById(studentId) {
    const [rows] = await promisePool.query(
      "SELECT * FROM students WHERE user_id = ?",
      [studentId]
    );
    if (rows.length === 0) {
      throw new Error("Student not found");
    }
    return rows[0];
  }

  // Get student details with statistics
  async getStudentWithStats(studentId) {
    // Get basic student info with email and batch
    const [studentRows] = await promisePool.query(`
      SELECT
        s.*,
        u.email,
        u.is_deleted,
        u.status,
        b.batch_name
      FROM students s
      JOIN users u ON s.user_id = u.uuid
      LEFT JOIN batches b ON s.batch_id = b.id
      WHERE s.user_id = ?
    `, [studentId]);

    if (studentRows.length === 0) {
      throw new Error("Student not found");
    }

    const student = studentRows[0];

    // Get enrolled courses list with details
    const [coursesList] = await promisePool.query(`
      SELECT
        c.id,
        c.title,
        c.level,
        c.status,
        c.thumbnail,
        e.enrolled_date,
        i.first_name as instructor_first_name,
        i.last_name as instructor_last_name
      FROM enrol e
      JOIN course c ON e.course_id = c.id
      LEFT JOIN instructors i ON c.creator_id = i.user_id
      WHERE e.user_id = ? AND c.is_deleted = 0
      ORDER BY e.enrolled_date DESC
    `, [studentId]);

    // Get registered events list with details
    const [eventsList] = await promisePool.query(`
      SELECT
        ev.id,
        ev.title,
        ev.start_date,
        ev.end_date,
        ev.online_event,
        ea.registered_at,
        i.first_name as creator_first_name,
        i.last_name as creator_last_name
      FROM event_attendees ea
      JOIN events ev ON ea.event_id = ev.id
      LEFT JOIN instructors i ON ev.creator_id = i.user_id
      WHERE ea.recipient_id = ? AND ev.is_deleted = 0
      ORDER BY ea.registered_at DESC
    `, [studentId]);

    // Get 1:1 sessions list with mentor details
    const [sessionsList] = await promisePool.query(`
      SELECT
        ss.id,
        ss.topic,
        ss.session_date,
        ss.session_time,
        ss.duration,
        ss.status,
        ss.url,
        i.first_name as mentor_first_name,
        i.last_name as mentor_last_name,
        i.expertise,
        u.email as mentor_email
      FROM scheduled_sessions ss
      JOIN instructors i ON ss.mentor_id = i.user_id
      JOIN users u ON i.user_id = u.uuid
      WHERE ss.mentee_id = ?
      ORDER BY ss.session_date DESC, ss.session_time DESC
    `, [studentId]);

    // Get assigned mentors with their details and session counts
    const [mentorsList] = await promisePool.query(`
      SELECT DISTINCT
        i.user_id as mentor_id,
        i.first_name,
        i.last_name,
        i.expertise,
        i.dp,
        u.email,
        COUNT(DISTINCT ss.id) as total_sessions
      FROM scheduled_sessions ss
      JOIN instructors i ON ss.mentor_id = i.user_id
      JOIN users u ON i.user_id = u.uuid
      WHERE ss.mentee_id = ? AND u.is_deleted = 0
      GROUP BY i.user_id
      ORDER BY total_sessions DESC
    `, [studentId]);

    return {
      ...student,
      statistics: {
        total_courses_enrolled: coursesList.length,
        total_events_registered: eventsList.length,
        total_sessions: sessionsList.length,
        assigned_mentors: mentorsList,
        courses: coursesList,
        events: eventsList,
        sessions: sessionsList
      }
    };
  }

  async createStudent(data) {
    const { first_name, last_name, email, batch_id } = data;

    if (!first_name || !email || !last_name) {
      throw new Error("Name and email are required");
    }

    // Generate UUID v4
    const uuid = uuidv4();

    // Generate a random password (8 chars, alphanumeric)
    const randomPassword = crypto.randomBytes(6).toString("base64"); // You can change length if needed

    // First, insert into users table
    const [userResult] = await promisePool.query(
      `INSERT INTO users (uuid, email, password, role_id, instance, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, email, randomPassword, 1, "isms-lxp", "active"]
    );

    const userId = userResult.insertId;

    // Then insert into students table with batch_id
    const [studentResult] = await promisePool.query(
      `INSERT INTO students (user_id, first_name, last_name, batch_id)
     VALUES (?, ?, ?, ?)`,
      [uuid, first_name, last_name, batch_id || null]
    );

    return {
      uuid,
      studentId: studentResult.insertId,
      generatedPassword: randomPassword, // optional, for sending to the user
    };
  }

  async updateStudent(studentId, data) {
    const { first_name, last_name, email, batch_id } = data;
    await promisePool.query(
      "UPDATE students SET first_name = ?, last_name = ?, batch_id = ? WHERE user_id = ?",
      [first_name, last_name, batch_id || null, studentId]
    );
    await promisePool.query("UPDATE users SET email = ? WHERE uuid = ?", [
      email,
      studentId,
    ]);
    return true;
  }

  async deleteStudent(studentId) {
    await promisePool.query(
      "update users set is_deleted=1 WHERE uuid = ? and role_id=1",
      [studentId]
    );
    return true;
  }
}

module.exports = new AdminStudentService();
