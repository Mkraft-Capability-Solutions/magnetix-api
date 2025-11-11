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

    // Get total courses enrolled
    const [courseStats] = await promisePool.query(`
      SELECT COUNT(*) as total_courses
      FROM enrol
      WHERE user_id = ?
    `, [studentId]);

    // Get total events registered
    const [eventStats] = await promisePool.query(`
      SELECT COUNT(*) as total_events
      FROM event_attendees
      WHERE recipient_id = ?
    `, [studentId]);

    // Get total 1:1 sessions with mentors
    const [sessionStats] = await promisePool.query(`
      SELECT COUNT(*) as total_sessions
      FROM scheduled_sessions
      WHERE mentee_id = ?
    `, [studentId]);

    // Get assigned mentors with their details
    const [mentorStats] = await promisePool.query(`
      SELECT DISTINCT
        i.user_id as mentor_id,
        i.first_name,
        i.last_name,
        i.expertise,
        u.email
      FROM scheduled_sessions ss
      JOIN instructors i ON ss.mentor_id = i.user_id
      JOIN users u ON i.user_id = u.uuid
      WHERE ss.mentee_id = ? AND u.is_deleted = 0
    `, [studentId]);

    return {
      ...student,
      statistics: {
        total_courses_enrolled: courseStats[0]?.total_courses || 0,
        total_events_registered: eventStats[0]?.total_events || 0,
        total_sessions: sessionStats[0]?.total_sessions || 0,
        assigned_mentors: mentorStats || []
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
