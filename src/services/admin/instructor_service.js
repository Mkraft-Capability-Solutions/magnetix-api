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
}
module.exports = new AdminInstructorService();