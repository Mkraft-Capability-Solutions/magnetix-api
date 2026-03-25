const { promisePool } = require("../../config/db");

class CourseSectionLessonRepository {
  // ============================================================================
  // SECTION OPERATIONS
  // ============================================================================

  async insertSection(connection, { title, courseId, creatorId }) {
    const [result] = await connection.query(
      `INSERT INTO course_section (title, course_id, creator_id, last_updated_by)
       VALUES (?, ?, ?, ?)`,
      [title, courseId, creatorId, creatorId]
    );
    return result;
  }

  async findSectionsByCourseId(courseId) {
    const [sections] = await promisePool.query(
      "SELECT * FROM course_section WHERE course_id = ? ORDER BY id ASC",
      [courseId]
    );
    return sections;
  }

  async updateSectionTitle(connection, { sectionId, courseId, title, updatedBy }) {
    const [result] = await connection.query(
      `UPDATE course_section
       SET title = ?, last_updated_by = ?, last_updated = NOW()
       WHERE id = ? AND course_id = ?`,
      [title, updatedBy, sectionId, courseId]
    );
    return result;
  }

  // ============================================================================
  // LESSON OPERATIONS
  // ============================================================================

  async findLessonsByCourseId(courseId) {
    const [lessons] = await promisePool.query(
      `SELECT l.*
       FROM course_lesson l
       WHERE l.course_id = ?
       ORDER BY l.section_id, l.lesson_order, l.id ASC`,
      [courseId]
    );
    return lessons;
  }

  async insertLesson(connection, params) {
    const {
      title, sectionId, lessonType, contentType,
      documentFile, scormFile, mp4File, contentUrl,
      lessonDuration, courseId, creatorId, lessonOrder,
      assessmentId, requireSectionCompletion,
      assessmentStartDate, assessmentEndDate,
    } = params;

    const [result] = await connection.query(
      `INSERT INTO course_lesson (
        title, section_id, lesson_type, lesson_content_type,
        lesson_content_document, lesson_content_scorm, lesson_content_mp4, lesson_content_url,
        lesson_duration, course_id, creator_id, last_updated_by,
        lesson_order, assessment_id, require_section_completion,
        assessment_start_date, assessment_end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, sectionId, lessonType, contentType,
        documentFile, scormFile, mp4File, contentUrl,
        lessonDuration, courseId, creatorId, creatorId,
        lessonOrder, assessmentId, requireSectionCompletion,
        assessmentStartDate, assessmentEndDate,
      ]
    );
    return result;
  }

  async findLessonByIdAndCourseId(lessonId, courseId, connection = null) {
    const db = connection || promisePool;
    const [lessons] = await db.query(
      `SELECT l.*, s.title AS section_title
       FROM course_lesson l
       LEFT JOIN course_section s ON l.section_id = s.id
       WHERE l.id = ? AND l.course_id = ?`,
      [lessonId, courseId]
    );
    return lessons[0] || null;
  }

  async findLessonContentById(connection, lessonId, courseId) {
    const [rows] = await connection.query(
      `SELECT lesson_content_document, lesson_content_scorm, lesson_content_mp4, lesson_content_url
       FROM course_lesson
       WHERE id = ? AND course_id = ?`,
      [lessonId, courseId]
    );
    return rows[0] || null;
  }

  async updateLesson(connection, params) {
    const {
      lessonId, courseId, title, sectionId, lessonOrder,
      lessonType, contentType, documentFile, scormFile,
      mp4File, contentUrl, lessonDuration,
      assessmentId, requireSectionCompletion,
      assessmentStartDate, assessmentEndDate, updatedBy,
    } = params;

    const [result] = await connection.query(
      `UPDATE course_lesson SET
       title = ?, section_id = ?, lesson_order = ?,
       lesson_type = ?, lesson_content_type = ?,
       lesson_content_document = ?, lesson_content_scorm = ?,
       lesson_content_mp4 = ?, lesson_content_url = ?,
       lesson_duration = ?,
       assessment_id = ?, require_section_completion = ?,
       assessment_start_date = ?, assessment_end_date = ?,
       last_updated_by = ?, last_updated = NOW()
       WHERE id = ? AND course_id = ?`,
      [
        title, sectionId, lessonOrder,
        lessonType, contentType,
        documentFile, scormFile, mp4File, contentUrl,
        lessonDuration,
        assessmentId, requireSectionCompletion,
        assessmentStartDate, assessmentEndDate,
        updatedBy, lessonId, courseId,
      ]
    );
    return result;
  }

  async deleteLessonById(connection, lessonId, courseId) {
    const [result] = await connection.query(
      "DELETE FROM course_lesson WHERE id = ? AND course_id = ?",
      [lessonId, courseId]
    );
    return result;
  }

  // ============================================================================
  // ILTS OPERATIONS
  // ============================================================================

  async insertIltsSession(connection, params) {
    const {
      courseId, lessonId, iltsMode, meetUrl, venue,
      startDate, startTime, endDate, endTime, creatorId,
    } = params;

    const [result] = await connection.query(
      `INSERT INTO ilts (course_id, lesson_id, lesson_mode, meet_url, venue,
       start_date, start_time, end_date, end_time,
       creator_id, last_updated_by, created_at, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        courseId, lessonId, iltsMode, meetUrl, venue,
        startDate, startTime, endDate, endTime,
        creatorId, creatorId,
      ]
    );
    return result;
  }

  async insertIltsViaStoredProc(connection, params) {
    const {
      courseId, lessonId, iltsMode, meetUrl, venue,
      startDate, startTime, endDate, endTime, creatorId,
    } = params;

    const [result] = await connection.query(
      "CALL add_ilts_session(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [courseId, lessonId, iltsMode, meetUrl, venue,
       startDate, startTime, endDate, endTime, creatorId]
    );
    return result;
  }

  async deleteIltsByLessonId(connection, lessonId) {
    const [result] = await connection.query(
      "DELETE FROM ilts WHERE lesson_id = ?",
      [lessonId]
    );
    return result;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async getConnection() {
    return promisePool.getConnection();
  }
}

module.exports = new CourseSectionLessonRepository();
