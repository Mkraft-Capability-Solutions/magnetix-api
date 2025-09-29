const { promisePool } = require("../config/db");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");

class UploadService {
  constructor() {
    this.uploadPaths = {
      courseThumbnail: path.join(__dirname, "../../uploads/courses/thumbnail"),
      eventThumbnail: path.join(__dirname, "../../uploads/events/thumbnail"),
      eventAttendance: path.join(__dirname, "../../uploads/events/attendance"),
      userProfile: path.join(__dirname, "../../uploads/users/profile_picture"),
      courseOverviewUrl: path.join(
        __dirname,
        "../../uploads/courses/course_overview/url"
      ),
      courseOverviewScorm: path.join(
        __dirname,
        "../../uploads/courses/course_overview/scorm"
      ),
      lessonDocument: path.join(
        __dirname,
        "../../uploads/courses/lessons/documents"
      ),
      lessonScorm: path.join(
        __dirname,
        "../../uploads/courses/lessons/scorm_packages"
      ),
      lessonMp4: path.join(__dirname, "../../uploads/courses/lessons/mp4"),
    };
  }

  async ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async uploadSingleFile(file, dirPath, allowedExtensions) {
    await this.ensureDirectoryExists(dirPath);

    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`
      );
    }

    const filename = `${Date.now()}${ext}`;
    const filePath = path.join(dirPath, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    return filename;
  }

  async uploadAndExtractZip(file, dirPath, allowedExtensions = [".zip"]) {
    console.log("Upload service - Starting SCORM extraction:", {
      filename: file.originalname,
      size: file.buffer.length,
      directory: dirPath,
    });

    await this.ensureDirectoryExists(dirPath);

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`
      );
    }

    try {
      console.log("Upload service - Creating AdmZip instance");
      const zip = new AdmZip(file.buffer);

      console.log("Upload service - Checking zip contents");
      const entries = zip.getEntries();
      console.log(`Upload service - Found ${entries.length} entries in zip`);

      const folderName = `${Date.now()}`;
      const extractPath = path.join(dirPath, folderName);

      console.log("Upload service - Extracting to:", extractPath);
      zip.extractAllTo(extractPath, true);

      console.log("Upload service - Extraction completed successfully");

      // Verify extraction by checking if directory exists
      if (!fs.existsSync(extractPath)) {
        throw new Error("Extraction failed - directory not created");
      }

      return folderName;
    } catch (error) {
      console.error("Upload service - Extraction error:", error);
      throw new Error(`Invalid or corrupted zip file: ${error.message}`);
    }
  }

  // Course Thumbnail
  async uploadCourseThumbnail(file, courseId) {
    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.courseThumbnail,
      [".jpg", ".jpeg", ".png", ".gif"]
    );

    if (courseId) {
      await promisePool.query("UPDATE course SET thumbnail = ? WHERE id = ?", [
        filename,
        courseId,
      ]);
    }

    return filename;
  }

  // Event Thumbnail
  async uploadEventThumbnail(file, eventId) {
    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.eventThumbnail,
      [".jpg", ".jpeg", ".png", ".gif"]
    );

    if (eventId) {
      await promisePool.query(
        "UPDATE events SET event_thumbnail = ? WHERE id = ?",
        [filename, eventId]
      );
    }

    return filename;
  }

  // User Profile Picture
  async uploadUserProfilePicture(file, userId) {
    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.userProfile,
      [".jpg", ".jpeg", ".png", ".gif"]
    );

    if (userId) {
      await promisePool.query("UPDATE users SET dp = ? WHERE uuid = ?", [
        filename,
        userId,
      ]);
    }

    return filename;
  }

  // Course Overview Video
  async uploadCourseOverviewVideo(file, courseId) {
    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.courseOverviewUrl,
      [".mp4", ".webm", ".mov"]
    );

    if (courseId) {
      await promisePool.query(
        "UPDATE course SET course_overview_video_url = ? WHERE id = ?",
        [filename, courseId]
      );
    }

    return filename;
  }

  // Course Overview SCORM
  async uploadCourseOverviewScorm(file, courseId) {
    const scormPath = await this.uploadAndExtractZip(
      file,
      this.uploadPaths.courseOverviewScorm
    );

    if (courseId) {
      await promisePool.query(
        "UPDATE course SET course_overview_scorm_file = ? WHERE id = ?",
        [scormPath, courseId]
      );
    }

    return scormPath;
  }

  // Lesson SCORM
  async uploadLessonScorm(file, lessonId) {
    const folderName = await this.uploadAndExtractZip(
      file,
      this.uploadPaths.lessonScorm,
      [".zip"]
    );

    if (lessonId) {
      await promisePool.query(
        "UPDATE course_lesson SET lesson_content_scorm = ? WHERE id = ?",
        [folderName, lessonId]
      );
    }

    return folderName;
  }

  // Lesson Document
  async uploadLessonDocument(file, lessonId) {
    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.lessonDocument,
      [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt"]
    );

    if (lessonId) {
      await promisePool.query(
        "UPDATE course_lesson SET lesson_content_document = ? WHERE id = ?",
        [filename, lessonId]
      );
    }

    return filename;
  }

  // Lesson MP4
  async uploadLessonMp4(file, lessonId) {
    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.lessonMp4,
      [".mp4"]
    );

    if (lessonId) {
      await promisePool.query(
        "UPDATE course_lesson SET lesson_content_mp4 = ? WHERE id = ?",
        [filename, lessonId]
      );
    }

    return filename;
  }

  // Event Attendance File
  async uploadEventAttendanceFile(file, eventId) {
    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.eventAttendance,
      [".pdf", ".docx", ".xlsx"]
    );

    if (eventId) {
      await promisePool.query(
        "UPDATE events SET attendance_file = ? WHERE id = ?",
        [filename, eventId]
      );
    }

    return filename;
  }

  // Get attendance file path for download
  getAttendanceFilePath(filename) {
    return path.join(this.uploadPaths.eventAttendance, filename);
  }
}

module.exports = new UploadService();
