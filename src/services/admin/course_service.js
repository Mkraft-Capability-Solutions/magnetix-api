const { promisePool } = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class AdminCourseService {
  async getAllCourses() {
    const [rows] = await promisePool.query("SELECT * FROM course");
    return rows;
  }

  async getCourseById(courseId) {
    const [rows] = await promisePool.query(
      "SELECT * FROM course WHERE id = ?",
      [courseId]
    );
    if (rows.length === 0) {
      throw new Error("Course not found");
    }
    return rows[0];
  }

  async createCourse(data) {
    const { title, description, instructorId } = data;

    if (!title || !description || !instructorId) {
      throw new Error("Title, description, and instructor ID are required");
    }

    const courseId = uuidv4();

    await promisePool.query(
      `INSERT INTO course (id, title, description, instructor_id)
       VALUES (?, ?, ?, ?)`,
      [courseId, title, description, instructorId]
    );

    return courseId;
  }

  async updateCourse(courseId, data) {
    const { title, description } = data;

    await promisePool.query(
      `UPDATE course SET title = ?, description = ?
       WHERE id = ?`,
      [title, description, courseId]
    );

    return true;
  }

  async deleteCourse(courseId) {
    await promisePool.query("DELETE FROM course WHERE id = ?", [courseId]);
    return true;
  }
}
module.exports = new AdminCourseService();
