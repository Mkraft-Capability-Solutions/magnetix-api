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
      certificates: path.join(__dirname, "../../uploads/certificates"),
    };
  }

  async ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async deleteOldFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`Deleted old file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error deleting old file ${filePath}:`, error);
    }
  }

  async deleteOldDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        await fs.promises.rm(dirPath, { recursive: true, force: true });
        console.log(`Deleted old directory: ${dirPath}`);
      }
    } catch (error) {
      console.error(`Error deleting old directory ${dirPath}:`, error);
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
    // Get old thumbnail filename if updating
    let oldFilename = null;
    if (courseId) {
      const [rows] = await promisePool.query(
        "SELECT thumbnail FROM course WHERE id = ?",
        [courseId]
      );
      if (rows.length > 0 && rows[0].thumbnail) {
        oldFilename = rows[0].thumbnail;
      }
    }

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

      // Delete old file after successful update
      if (oldFilename) {
        const oldFilePath = path.join(this.uploadPaths.courseThumbnail, oldFilename);
        await this.deleteOldFile(oldFilePath);
      }
    }

    return filename;
  }

  // Event Thumbnail
  async uploadEventThumbnail(file, eventId) {
    // Get old thumbnail filename if updating
    let oldFilename = null;
    if (eventId) {
      const [rows] = await promisePool.query(
        "SELECT event_thumbnail FROM events WHERE id = ?",
        [eventId]
      );
      if (rows.length > 0 && rows[0].event_thumbnail) {
        oldFilename = rows[0].event_thumbnail;
      }
    }

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

      // Delete old file after successful update
      if (oldFilename) {
        const oldFilePath = path.join(this.uploadPaths.eventThumbnail, oldFilename);
        await this.deleteOldFile(oldFilePath);
      }
    }

    return filename;
  }

  // User Profile Picture
  async uploadUserProfilePicture(file, userId) {
    // Get old profile picture filename if updating
    let oldFilename = null;
    if (userId) {
      const [rows] = await promisePool.query(
        "SELECT dp FROM users WHERE uuid = ?",
        [userId]
      );
      if (rows.length > 0 && rows[0].dp) {
        oldFilename = rows[0].dp;
      }
    }

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

      // Delete old file after successful update
      if (oldFilename) {
        const oldFilePath = path.join(this.uploadPaths.userProfile, oldFilename);
        await this.deleteOldFile(oldFilePath);
      }
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
    // Get old SCORM folder name if updating
    let oldFolderName = null;
    if (lessonId) {
      const [rows] = await promisePool.query(
        "SELECT lesson_content_scorm FROM course_lesson WHERE id = ?",
        [lessonId]
      );
      if (rows.length > 0 && rows[0].lesson_content_scorm) {
        oldFolderName = rows[0].lesson_content_scorm;
      }
    }

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

      // Delete old SCORM folder after successful update
      if (oldFolderName) {
        const oldFolderPath = path.join(this.uploadPaths.lessonScorm, oldFolderName);
        await this.deleteOldDirectory(oldFolderPath);
      }
    }

    return folderName;
  }

  // Lesson Document
  async uploadLessonDocument(file, lessonId) {
    // Get old document filename if updating
    let oldFilename = null;
    if (lessonId) {
      const [rows] = await promisePool.query(
        "SELECT lesson_content_document FROM course_lesson WHERE id = ?",
        [lessonId]
      );
      if (rows.length > 0 && rows[0].lesson_content_document) {
        oldFilename = rows[0].lesson_content_document;
      }
    }

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

      // Delete old file after successful update
      if (oldFilename) {
        const oldFilePath = path.join(this.uploadPaths.lessonDocument, oldFilename);
        await this.deleteOldFile(oldFilePath);
      }
    }

    return filename;
  }

  // Lesson MP4
  async uploadLessonMp4(file, lessonId) {
    // Get old MP4 filename if updating
    let oldFilename = null;
    if (lessonId) {
      const [rows] = await promisePool.query(
        "SELECT lesson_content_mp4 FROM course_lesson WHERE id = ?",
        [lessonId]
      );
      if (rows.length > 0 && rows[0].lesson_content_mp4) {
        oldFilename = rows[0].lesson_content_mp4;
      }
    }

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

      // Delete old file after successful update
      if (oldFilename) {
        const oldFilePath = path.join(this.uploadPaths.lessonMp4, oldFilename);
        await this.deleteOldFile(oldFilePath);
      }
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

  // Certificate Upload
  async uploadCertificate(file, userId) {
    // Create user-specific certificate directory
    const userCertificateDir = path.join(this.uploadPaths.certificates, userId);
    await this.ensureDirectoryExists(userCertificateDir);

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg"];

    if (!allowedExtensions.includes(ext)) {
      throw new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`
      );
    }

    const filename = `certificate_${Date.now()}${ext}`;
    const filePath = path.join(userCertificateDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    // Return relative path for database storage
    return `certificates/${userId}/${filename}`;
  }
}

module.exports = new UploadService();
