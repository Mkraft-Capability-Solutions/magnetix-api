const repository = require("../../repositories/admin/courseSectionLessonRepository");
const logger = require("../../config/logger");
const AppError = require("../../utils/appError");

class CourseSectionLessonService {
  // ============================================================================
  // SECTION OPERATIONS
  // ============================================================================

  async addSection(courseId, title, creatorId) {
    const connection = await repository.getConnection();
    try {
      await connection.beginTransaction();

      const result = await repository.insertSection(connection, {
        title,
        courseId,
        creatorId,
      });

      if (result.affectedRows === 0) {
        throw new AppError("Failed to add section", 500);
      }

      await connection.commit();
      return { id: result.insertId };
    } catch (error) {
      await connection.rollback();
      logger.error("Error adding section", { courseId, error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }

  async getSectionsByCourseId(courseId) {
    const [sections, lessons] = await Promise.all([
      repository.findSectionsByCourseId(courseId),
      repository.findLessonsByCourseId(courseId),
    ]);

    return sections.map((section) => {
      const sectionLessons = lessons.filter(
        (lesson) => lesson.section_id === section.id
      );

      return {
        id: section.id,
        title: section.title,
        sectionOrder: section.section_order || section.id,
        createdAt: section.created_date || section.created_at,
        lessons: sectionLessons.map((lesson) => this._mapLessonToResponse(lesson, section.title)),
      };
    });
  }

  async updateSection(courseId, sectionId, title, updatedBy) {
    const connection = await repository.getConnection();
    try {
      await connection.beginTransaction();

      const result = await repository.updateSectionTitle(connection, {
        sectionId,
        courseId,
        title,
        updatedBy,
      });

      if (result.affectedRows === 0) {
        throw new AppError("Section not found", 404);
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      logger.error("Error updating section", { courseId, sectionId, error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================================================
  // LESSON OPERATIONS
  // ============================================================================

  async addLesson(courseId, lessonData, creatorId) {
    const connection = await repository.getConnection();
    try {
      await connection.beginTransaction();

      const contentFields = this._resolveContentFields(lessonData);

      const result = await repository.insertLesson(connection, {
        title: lessonData.title || null,
        sectionId: lessonData.sectionId || null,
        lessonType: lessonData.lessonType || "Content-Based",
        contentType: contentFields.dbContentType,
        documentFile: contentFields.documentFile,
        scormFile: contentFields.scormFile,
        mp4File: contentFields.mp4File,
        contentUrl: contentFields.contentUrl,
        lessonDuration: lessonData.lessonDuration || lessonData.duration || null,
        courseId,
        creatorId,
        lessonOrder: lessonData.lessonOrder || null,
        assessmentId: lessonData.assessmentId || null,
        requireSectionCompletion: lessonData.requireSectionCompletion ? 1 : 0,
        assessmentStartDate: lessonData.assessmentStartDate || null,
        assessmentEndDate: lessonData.assessmentEndDate || null,
      });

      const lessonId = result.insertId;

      if (lessonData.lessonType === "ILTS") {
        await this._upsertIltsSession(connection, {
          courseId,
          lessonId,
          lessonData,
          creatorId,
        });
      }

      await connection.commit();
      logger.info("Lesson created", { courseId, lessonId });
      return lessonId;
    } catch (error) {
      await connection.rollback();
      logger.error("Error adding lesson", { courseId, error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateLesson(courseId, lessonId, lessonData, updatedBy) {
    const connection = await repository.getConnection();
    try {
      await connection.beginTransaction();

      const contentFields = this._resolveContentFieldsForUpdate(lessonData);

      // Preserve existing file values when not explicitly provided
      const currentLesson = await repository.findLessonContentById(connection, lessonId, courseId);
      if (!currentLesson) {
        throw new AppError("Lesson not found", 404);
      }

      const mergedFiles = this._mergeContentFiles(currentLesson, contentFields);

      const result = await repository.updateLesson(connection, {
        lessonId,
        courseId,
        title: lessonData.title,
        sectionId: lessonData.sectionId,
        lessonOrder: lessonData.lessonOrder || 1,
        lessonType: lessonData.lessonType || "Content-Based",
        contentType: contentFields.dbContentType,
        documentFile: mergedFiles.documentFile,
        scormFile: mergedFiles.scormFile,
        mp4File: mergedFiles.mp4File,
        contentUrl: mergedFiles.contentUrl,
        lessonDuration: lessonData.duration || lessonData.lessonDuration || null,
        assessmentId: lessonData.assessmentId || null,
        requireSectionCompletion: lessonData.requireSectionCompletion ? 1 : 0,
        assessmentStartDate: lessonData.assessmentStartDate || null,
        assessmentEndDate: lessonData.assessmentEndDate || null,
        updatedBy,
      });

      if (result.affectedRows === 0) {
        throw new AppError("Lesson not found", 404);
      }

      // Handle ILTS: upsert or clean up
      if (lessonData.lessonType === "ILTS") {
        await repository.deleteIltsByLessonId(connection, lessonId);
        await this._upsertIltsSession(connection, {
          courseId,
          lessonId,
          lessonData,
          creatorId: updatedBy,
        });
      } else {
        await repository.deleteIltsByLessonId(connection, lessonId);
      }

      await connection.commit();
      logger.info("Lesson updated", { courseId, lessonId });
      return { success: true };
    } catch (error) {
      await connection.rollback();
      logger.error("Error updating lesson", { courseId, lessonId, error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteLesson(courseId, lessonId) {
    const connection = await repository.getConnection();
    try {
      await connection.beginTransaction();

      await repository.deleteIltsByLessonId(connection, lessonId);

      const result = await repository.deleteLessonById(connection, lessonId, courseId);
      if (result.affectedRows === 0) {
        throw new AppError("Lesson not found", 404);
      }

      await connection.commit();
      logger.info("Lesson deleted", { courseId, lessonId });
      return { success: true };
    } catch (error) {
      await connection.rollback();
      logger.error("Error deleting lesson", { courseId, lessonId, error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }

  async getLessonById(courseId, lessonId) {
    const lesson = await repository.findLessonByIdAndCourseId(lessonId, courseId);

    if (!lesson) {
      throw new AppError("Lesson not found", 404);
    }

    return {
      id: lesson.id,
      title: lesson.title,
      sectionId: lesson.section_id,
      sectionTitle: lesson.section_title,
      lessonOrder: lesson.lesson_order,
      lessonType: lesson.lesson_type,
      contentType: lesson.lesson_content_type,
      lessonContentDocument: lesson.lesson_content_document,
      scormPackage: lesson.lesson_content_scorm,
      videoUpload: lesson.lesson_content_mp4,
      contentUrl: lesson.lesson_content_url,
      lessonDuration: lesson.lesson_duration,
      duration: lesson.lesson_duration,
      description: lesson.description,
      skills: lesson.skills ? JSON.parse(lesson.skills) : [],
      assessmentId: lesson.assessment_id,
      requireSectionCompletion: !!lesson.require_section_completion,
      assessmentStartDate: lesson.assessment_start_date,
      assessmentEndDate: lesson.assessment_end_date,
      iltsType: lesson.ilts_type,
      iltsUrl: lesson.ilts_url,
      startDate: lesson.start_date,
      startTime: lesson.start_time,
      endDate: lesson.end_date,
      endTime: lesson.end_time,
      eventVenue: lesson.event_venue,
      meetUrl: lesson.meet_url,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  _isValidFileString(value) {
    return (
      value &&
      typeof value === "string" &&
      value.trim() !== ""
    );
  }

  _resolveContentFields(lessonData) {
    let dbContentType = null;
    let documentFile = null;
    let scormFile = null;
    let mp4File = null;
    let contentUrl = null;

    if (lessonData.contentType) {
      switch (lessonData.contentType) {
        case "mp4":
          dbContentType = "mp4";
          mp4File = this._isValidFileString(lessonData.videoUpload)
            ? lessonData.videoUpload
            : this._isValidFileString(lessonData.file)
              ? lessonData.file
              : null;
          break;
        case "document":
          dbContentType = "document";
          documentFile = this._isValidFileString(lessonData.lessonContentDocument)
            ? lessonData.lessonContentDocument
            : this._isValidFileString(lessonData.file)
              ? lessonData.file
              : null;
          break;
        case "scorm":
          dbContentType = "scorm";
          // SCORM file is uploaded separately after lesson creation
          break;
        case "url":
          dbContentType = "url";
          contentUrl = lessonData.contentUrl || lessonData.url || null;
          break;
        case "quiz":
          dbContentType = "quiz";
          break;
        default:
          dbContentType = lessonData.contentType;
      }
    }

    return { dbContentType, documentFile, scormFile, mp4File, contentUrl };
  }

  _resolveContentFieldsForUpdate(lessonData) {
    let dbContentType = null;

    if (lessonData.contentType) {
      const validTypes = ["mp4", "document", "scorm", "url", "quiz"];
      dbContentType = validTypes.includes(lessonData.contentType)
        ? lessonData.contentType
        : lessonData.contentType;
    }

    return { dbContentType };
  }

  _mergeContentFiles(currentLesson, contentFields) {
    const { dbContentType } = contentFields;

    let documentFile = currentLesson.lesson_content_document || null;
    let scormFile = currentLesson.lesson_content_scorm || null;
    let mp4File = currentLesson.lesson_content_mp4 || null;
    let contentUrl = currentLesson.lesson_content_url || null;

    // Clear non-matching content types when switching
    if (dbContentType) {
      if (dbContentType !== "document") documentFile = null;
      if (dbContentType !== "scorm") scormFile = null;
      if (dbContentType !== "mp4") mp4File = null;
      if (dbContentType !== "url") contentUrl = null;
    }

    return { documentFile, scormFile, mp4File, contentUrl };
  }

  _cleanEmptyToNull(value) {
    return value === "" || value === undefined ? null : value;
  }

  _formatDateForDB(dateValue) {
    if (!dateValue || dateValue === "") return null;

    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async _upsertIltsSession(connection, { courseId, lessonId, lessonData, creatorId }) {
    const iltsParams = {
      courseId,
      lessonId,
      iltsMode: lessonData.iltsType || "Online",
      meetUrl: this._cleanEmptyToNull(lessonData.meetingUrl),
      venue: this._cleanEmptyToNull(lessonData.venue),
      startDate: this._formatDateForDB(lessonData.startDate),
      startTime: this._cleanEmptyToNull(lessonData.startTime),
      endDate: this._formatDateForDB(lessonData.endDate),
      endTime: this._cleanEmptyToNull(lessonData.endTime),
      creatorId,
    };

    try {
      await repository.insertIltsViaStoredProc(connection, iltsParams);
    } catch (spError) {
      logger.warn("Stored procedure failed, using direct INSERT", { error: spError.message });
      await repository.insertIltsSession(connection, iltsParams);
    }
  }

  _mapLessonToResponse(lesson, sectionTitle) {
    return {
      id: lesson.id,
      title: lesson.title,
      section: sectionTitle,
      sectionId: lesson.section_id,
      lessonType: lesson.lesson_type,
      lessonOrder: lesson.lesson_order,
      contentType: lesson.lesson_content_type,
      lessonContentDocument: lesson.lesson_content_document,
      scormPackage: lesson.lesson_content_scorm,
      videoUpload: lesson.lesson_content_mp4,
      contentUrl: lesson.lesson_content_url,
      lessonDuration: lesson.lesson_duration,
      description: lesson.description,
      skills: lesson.skills ? JSON.parse(lesson.skills) : [],
      assessmentId: lesson.assessment_id,
      requireSectionCompletion: !!lesson.require_section_completion,
      assessmentStartDate: lesson.assessment_start_date,
      assessmentEndDate: lesson.assessment_end_date,
      iltsType: lesson.ilts_type,
      iltsUrl: lesson.ilts_url,
      startDate: lesson.start_date,
      startTime: lesson.start_time,
      endDate: lesson.end_date,
      endTime: lesson.end_time,
      eventVenue: lesson.event_venue,
      meetUrl: lesson.meet_url,
    };
  }
}

module.exports = new CourseSectionLessonService();
