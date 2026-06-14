const { promisePool } = require("../../config/db");
const uploadService = require("../upload_service");

class AdminLessonService {
  /**
   * Create a standalone lesson (without course_id and section_id)
   * These lessons can later be associated with courses
   */
  async createStandaloneLesson(userId, lessonData) {
    console.log("createStandaloneLesson called with data:", JSON.stringify(lessonData, null, 2));

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Map frontend contentType to database enum values
      let dbContentType = null;
      let documentFile = null;
      let scormFile = null;
      let mp4File = null;
      let contentUrl = null;

      if (lessonData.contentType) {
        switch (lessonData.contentType) {
          case 'mp4':
          case 'video':
            dbContentType = 'mp4';
            mp4File = lessonData.videoUpload || lessonData.file || null;
            break;
          case 'document':
          case 'pdf':
            dbContentType = 'document';
            documentFile = lessonData.lessonContentDocument || lessonData.file || null;
            break;
          case 'scorm':
            dbContentType = 'scorm';
            scormFile = lessonData.scormPackage || lessonData.file || null;
            break;
          case 'url':
          case 'external_url':
            dbContentType = 'url';
            contentUrl = lessonData.contentUrl || lessonData.url || null;
            break;
          default:
            dbContentType = lessonData.contentType;
        }
      }

      console.log(`Mapped content type: ${dbContentType}`);

      // Insert standalone lesson into standalone_lessons table
      const [result] = await connection.query(
        `INSERT INTO standalone_lessons (
          title,
          lesson_type,
          lesson_content_type,
          lesson_content_document,
          lesson_content_scorm,
          lesson_content_mp4,
          lesson_content_url,
          lesson_duration,
          description,
          creator_id,
          last_updated_by,
          created_date,
          last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          lessonData.title,
          lessonData.lessonType || "Content-Based",
          dbContentType,
          documentFile,
          scormFile,
          mp4File,
          contentUrl,
          lessonData.lessonDuration || lessonData.duration || null,
          lessonData.description || null,
          userId,
          userId
        ]
      );

      const lessonId = result.insertId;
      console.log("Standalone lesson created with ID:", lessonId);

      // Handle ILTS if lesson type is ILTS
      if (lessonData.lessonType === "ILTS") {
        console.log("Adding ILTS session for standalone lesson:", lessonId);

        const iltsMode = lessonData.iltsType || "Online";
        const meetUrl = lessonData.meetingUrl || lessonData.meetUrl || null;
        const venue = lessonData.eventVenue || lessonData.venue || null;
        const startDate = lessonData.startDate || null;
        const startTime = lessonData.startTime || null;
        const endDate = lessonData.endDate || null;
        const endTime = lessonData.endTime || null;

        // Helper function to format date
        const formatDateForDB = (dateValue) => {
          if (!dateValue || dateValue === "") return null;

          try {
            if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              return dateValue;
            }

            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return null;

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          } catch (error) {
            console.error('Error formatting date:', dateValue, error);
            return null;
          }
        };

        const cleanMeetUrl = (meetUrl === "" || meetUrl === undefined) ? null : meetUrl;
        const cleanVenue = (venue === "" || venue === undefined) ? null : venue;
        const cleanStartDate = formatDateForDB(startDate);
        const cleanStartTime = (startTime === "" || startTime === undefined) ? null : startTime;
        const cleanEndDate = formatDateForDB(endDate);
        const cleanEndTime = (endTime === "" || endTime === undefined) ? null : endTime;

        try {
          // Insert ILTS into standalone_ilts table
          await connection.query(
            `INSERT INTO standalone_ilts (lesson_id, lesson_mode, meet_url, venue, start_date, start_time, end_date, end_time, creator_id, last_updated_by, created_at, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              lessonId,
              iltsMode,
              cleanMeetUrl,
              cleanVenue,
              cleanStartDate,
              cleanStartTime,
              cleanEndDate,
              cleanEndTime,
              userId,
              userId,
            ]
          );
          console.log("ILTS session added successfully for standalone lesson");
        } catch (iltsError) {
          console.error("Error adding ILTS session:", iltsError);
          // Don't throw - lesson is still created
        }
      }

      await connection.commit();

      return {
        success: true,
        data: {
          id: lessonId,
          title: lessonData.title,
          lessonType: lessonData.lessonType || "Content-Based",
          contentType: dbContentType,
          duration: lessonData.lessonDuration || lessonData.duration || null
        }
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in createStandaloneLesson:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all standalone lessons from standalone_lessons table
   */
  async getStandaloneLessons() {
    try {
      const [rows] = await promisePool.query(
        `SELECT
          sl.*,
          si.lesson_mode as ilts_mode,
          si.meet_url as ilts_meet_url,
          si.venue as ilts_venue,
          si.start_date as ilts_start_date,
          si.start_time as ilts_start_time,
          si.end_date as ilts_end_date,
          si.end_time as ilts_end_time,
          COALESCE(
            CONCAT(a.first_name, ' ', a.last_name),
            CONCAT(sa.first_name, ' ', sa.last_name),
            CONCAT(i.first_name, ' ', i.last_name)
          ) as creator_name
         FROM standalone_lessons sl
         LEFT JOIN standalone_ilts si ON sl.id = si.lesson_id
         LEFT JOIN admins a ON sl.creator_id COLLATE utf8mb4_unicode_ci = a.user_id COLLATE utf8mb4_unicode_ci
         LEFT JOIN super_admins sa ON sl.creator_id COLLATE utf8mb4_unicode_ci = sa.user_id COLLATE utf8mb4_unicode_ci
         LEFT JOIN instructors i ON sl.creator_id COLLATE utf8mb4_unicode_ci = i.user_id COLLATE utf8mb4_unicode_ci
         ORDER BY sl.created_date DESC`
      );

      return rows.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        lessonType: lesson.lesson_type,
        contentType: lesson.lesson_content_type,
        lessonContentDocument: lesson.lesson_content_document,
        lessonContentScorm: lesson.lesson_content_scorm,
        lessonContentMp4: lesson.lesson_content_mp4,
        lessonContentUrl: lesson.lesson_content_url,
        lessonDuration: lesson.lesson_duration,
        description: lesson.description,
        createdDate: lesson.created_date,
        lastUpdated: lesson.last_updated,
        creatorId: lesson.creator_id,
        creatorName: lesson.creator_name,
        // ILTS info if applicable
        iltsInfo: lesson.lesson_type === 'ILTS' && lesson.ilts_mode ? {
          mode: lesson.ilts_mode,
          meetUrl: lesson.ilts_meet_url,
          venue: lesson.ilts_venue,
          startDate: lesson.ilts_start_date,
          startTime: lesson.ilts_start_time,
          endDate: lesson.ilts_end_date,
          endTime: lesson.ilts_end_time
        } : null
      }));
    } catch (error) {
      console.error("Error in getStandaloneLessons:", error);
      throw error;
    }
  }

  /**
   * Get a single standalone lesson by ID from standalone_lessons table
   */
  async getStandaloneLessonById(lessonId) {
    try {
      const [rows] = await promisePool.query(
        `SELECT
          sl.*,
          si.lesson_mode as ilts_mode,
          si.meet_url as ilts_meet_url,
          si.venue as ilts_venue,
          si.start_date as ilts_start_date,
          si.start_time as ilts_start_time,
          si.end_date as ilts_end_date,
          si.end_time as ilts_end_time,
          COALESCE(
            CONCAT(a.first_name, ' ', a.last_name),
            CONCAT(sa.first_name, ' ', sa.last_name),
            CONCAT(i.first_name, ' ', i.last_name)
          ) as creator_name
         FROM standalone_lessons sl
         LEFT JOIN standalone_ilts si ON sl.id = si.lesson_id
         LEFT JOIN admins a ON sl.creator_id COLLATE utf8mb4_unicode_ci = a.user_id COLLATE utf8mb4_unicode_ci
         LEFT JOIN super_admins sa ON sl.creator_id COLLATE utf8mb4_unicode_ci = sa.user_id COLLATE utf8mb4_unicode_ci
         LEFT JOIN instructors i ON sl.creator_id COLLATE utf8mb4_unicode_ci = i.user_id COLLATE utf8mb4_unicode_ci
         WHERE sl.id = ?`,
        [lessonId]
      );

      if (rows.length === 0) {
        throw new Error("Standalone lesson not found");
      }

      const lesson = rows[0];
      return {
        id: lesson.id,
        title: lesson.title,
        lessonType: lesson.lesson_type,
        contentType: lesson.lesson_content_type,
        lessonContentDocument: lesson.lesson_content_document,
        lessonContentScorm: lesson.lesson_content_scorm,
        lessonContentMp4: lesson.lesson_content_mp4,
        lessonContentUrl: lesson.lesson_content_url,
        lessonDuration: lesson.lesson_duration,
        description: lesson.description,
        createdDate: lesson.created_date,
        lastUpdated: lesson.last_updated,
        creatorId: lesson.creator_id,
        creatorName: lesson.creator_name,
        iltsInfo: lesson.lesson_type === 'ILTS' && lesson.ilts_mode ? {
          mode: lesson.ilts_mode,
          meetUrl: lesson.ilts_meet_url,
          venue: lesson.ilts_venue,
          startDate: lesson.ilts_start_date,
          startTime: lesson.ilts_start_time,
          endDate: lesson.ilts_end_date,
          endTime: lesson.ilts_end_time
        } : null
      };
    } catch (error) {
      console.error("Error in getStandaloneLessonById:", error);
      throw error;
    }
  }

  /**
   * Update a standalone lesson
   */
  async updateStandaloneLesson(lessonId, userId, lessonData) {
    console.log("updateStandaloneLesson called for ID:", lessonId);

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify lesson exists in standalone_lessons table
      const [existing] = await connection.query(
        "SELECT id FROM standalone_lessons WHERE id = ?",
        [lessonId]
      );

      if (existing.length === 0) {
        throw new Error("Standalone lesson not found");
      }

      // Map content type
      let dbContentType = null;
      let documentFile = null;
      let scormFile = null;
      let mp4File = null;
      let contentUrl = null;

      if (lessonData.contentType) {
        switch (lessonData.contentType) {
          case 'mp4':
          case 'video':
            dbContentType = 'mp4';
            mp4File = lessonData.videoUpload || lessonData.file || null;
            break;
          case 'document':
          case 'pdf':
            dbContentType = 'document';
            documentFile = lessonData.lessonContentDocument || lessonData.file || null;
            break;
          case 'scorm':
            dbContentType = 'scorm';
            scormFile = lessonData.scormPackage || lessonData.file || null;
            break;
          case 'url':
          case 'external_url':
            dbContentType = 'url';
            contentUrl = lessonData.contentUrl || lessonData.url || null;
            break;
          default:
            dbContentType = lessonData.contentType;
        }
      }

      // Update lesson in standalone_lessons table
      await connection.query(
        `UPDATE standalone_lessons SET
         title = ?,
         lesson_type = ?,
         lesson_content_type = ?,
         lesson_content_document = ?,
         lesson_content_scorm = ?,
         lesson_content_mp4 = ?,
         lesson_content_url = ?,
         lesson_duration = ?,
         description = ?,
         last_updated_by = ?,
         last_updated = NOW()
         WHERE id = ?`,
        [
          lessonData.title,
          lessonData.lessonType || "Content-Based",
          dbContentType,
          documentFile,
          scormFile,
          mp4File,
          contentUrl,
          lessonData.lessonDuration || lessonData.duration || null,
          lessonData.description || null,
          userId,
          lessonId
        ]
      );

      // Handle ILTS updates
      if (lessonData.lessonType === "ILTS") {
        // Remove existing ILTS data from standalone_ilts
        await connection.query("DELETE FROM standalone_ilts WHERE lesson_id = ?", [lessonId]);

        // Add new ILTS data
        const iltsMode = lessonData.iltsType || "Online";
        const meetUrl = lessonData.meetingUrl || lessonData.meetUrl || null;
        const venue = lessonData.eventVenue || lessonData.venue || null;
        const startDate = lessonData.startDate || null;
        const startTime = lessonData.startTime || null;
        const endDate = lessonData.endDate || null;
        const endTime = lessonData.endTime || null;

        const formatDateForDB = (dateValue) => {
          if (!dateValue || dateValue === "") return null;
          try {
            if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
              return dateValue;
            }
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return null;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          } catch (error) {
            console.error('Error formatting date:', dateValue, error);
            return null;
          }
        };

        const cleanMeetUrl = (meetUrl === "" || meetUrl === undefined) ? null : meetUrl;
        const cleanVenue = (venue === "" || venue === undefined) ? null : venue;
        const cleanStartDate = formatDateForDB(startDate);
        const cleanStartTime = (startTime === "" || startTime === undefined) ? null : startTime;
        const cleanEndDate = formatDateForDB(endDate);
        const cleanEndTime = (endTime === "" || endTime === undefined) ? null : endTime;

        try {
          await connection.query(
            `INSERT INTO standalone_ilts (lesson_id, lesson_mode, meet_url, venue, start_date, start_time, end_date, end_time, creator_id, last_updated_by, created_at, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              lessonId,
              iltsMode,
              cleanMeetUrl,
              cleanVenue,
              cleanStartDate,
              cleanStartTime,
              cleanEndDate,
              cleanEndTime,
              userId,
              userId,
            ]
          );
        } catch (iltsError) {
          console.error("Error updating ILTS session:", iltsError);
        }
      } else {
        // Remove ILTS data if lesson type changed
        await connection.query("DELETE FROM standalone_ilts WHERE lesson_id = ?", [lessonId]);
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error in updateStandaloneLesson:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a standalone lesson from standalone_lessons table
   */
  async deleteStandaloneLesson(lessonId) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete related ILTS data first (CASCADE will handle this automatically, but being explicit)
      await connection.query("DELETE FROM standalone_ilts WHERE lesson_id = ?", [lessonId]);

      // Delete the lesson from standalone_lessons
      const [result] = await connection.query(
        "DELETE FROM standalone_lessons WHERE id = ?",
        [lessonId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Standalone lesson not found");
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error in deleteStandaloneLesson:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AdminLessonService();
