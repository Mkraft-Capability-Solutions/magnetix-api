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

      // Create extract directory
      await this.ensureDirectoryExists(extractPath);

      // Check if zip has a single root folder (common in SCORM packages)
      // Filter out macOS metadata first
      const validEntries = entries.filter(entry =>
        !entry.entryName.includes('__MACOSX') && !entry.entryName.includes('.DS_Store')
      );

      let rootFolder = null;
      const topLevelItems = new Set();

      validEntries.forEach(entry => {
        const parts = entry.entryName.split('/');
        if (parts.length > 0 && parts[0]) {
          topLevelItems.add(parts[0]);
        }
      });

      // If there's only one top-level folder, we'll strip it
      if (topLevelItems.size === 1) {
        rootFolder = Array.from(topLevelItems)[0] + '/';
        console.log(`Upload service - Detected single root folder: ${rootFolder} - will flatten structure`);
      }

      // Extract files, filtering out __MACOSX and .DS_Store
      let extractedCount = 0;
      validEntries.forEach(entry => {
        let entryName = entry.entryName;

        // If there's a single root folder, remove it from the path
        if (rootFolder && entryName.startsWith(rootFolder)) {
          entryName = entryName.substring(rootFolder.length);
        }

        // Skip empty paths (the root folder itself)
        if (!entryName) {
          return;
        }

        // Extract the entry
        if (entry.isDirectory) {
          const dirPath = path.join(extractPath, entryName);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
        } else {
          const filePath = path.join(extractPath, entryName);
          const fileDir = path.dirname(filePath);

          // Ensure parent directory exists
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }

          // Write file
          fs.writeFileSync(filePath, entry.getData());
          extractedCount++;
        }
      });

      console.log(`Upload service - Extraction completed successfully. Extracted ${extractedCount} files`);

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
    console.log("uploadLessonScorm called with lessonId:", lessonId);

    // Get old SCORM folder name if updating
    let oldFolderName = null;
    let isStandalone = false;

    if (lessonId) {
      // Check if it's a standalone lesson first
      const [standaloneRows] = await promisePool.query(
        "SELECT lesson_content_scorm FROM standalone_lessons WHERE id = ?",
        [lessonId]
      );

      console.log("Standalone check result:", standaloneRows);

      if (standaloneRows.length > 0) {
        isStandalone = true;
        console.log("Lesson is STANDALONE");
        if (standaloneRows[0].lesson_content_scorm) {
          oldFolderName = standaloneRows[0].lesson_content_scorm;
        }
      } else {
        // If not standalone, check course_lesson table
        console.log("Lesson not found in standalone_lessons, checking course_lesson");
        const [courseRows] = await promisePool.query(
          "SELECT lesson_content_scorm FROM course_lesson WHERE id = ?",
          [lessonId]
        );
        if (courseRows.length > 0 && courseRows[0].lesson_content_scorm) {
          oldFolderName = courseRows[0].lesson_content_scorm;
        }
      }
    }

    const folderName = await this.uploadAndExtractZip(
      file,
      this.uploadPaths.lessonScorm,
      [".zip"]
    );

    console.log("SCORM extracted to folder:", folderName);

    if (lessonId) {
      // Update the appropriate table
      if (isStandalone) {
        console.log("Updating standalone_lessons table");
        await promisePool.query(
          "UPDATE standalone_lessons SET lesson_content_scorm = ? WHERE id = ?",
          [folderName, lessonId]
        );
      } else {
        console.log("Updating course_lesson table");
        await promisePool.query(
          "UPDATE course_lesson SET lesson_content_scorm = ? WHERE id = ?",
          [folderName, lessonId]
        );
      }

      // Delete old SCORM folder after successful update
      if (oldFolderName) {
        const oldFolderPath = path.join(this.uploadPaths.lessonScorm, oldFolderName);
        await this.deleteOldDirectory(oldFolderPath);
      }
    }

    console.log("uploadLessonScorm completed successfully");
    return folderName;
  }

  // Lesson Document
  async uploadLessonDocument(file, lessonId) {
    console.log("uploadLessonDocument called with lessonId:", lessonId);

    // Get old document filename if updating
    let oldFilename = null;
    let isStandalone = false;

    if (lessonId) {
      // Check if it's a standalone lesson first
      const [standaloneRows] = await promisePool.query(
        "SELECT lesson_content_document FROM standalone_lessons WHERE id = ?",
        [lessonId]
      );

      console.log("Standalone check result:", standaloneRows);

      if (standaloneRows.length > 0) {
        isStandalone = true;
        console.log("Lesson is STANDALONE");
        if (standaloneRows[0].lesson_content_document) {
          oldFilename = standaloneRows[0].lesson_content_document;
        }
      } else {
        // If not standalone, check course_lesson table
        console.log("Lesson not found in standalone_lessons, checking course_lesson");
        const [courseRows] = await promisePool.query(
          "SELECT lesson_content_document FROM course_lesson WHERE id = ?",
          [lessonId]
        );
        if (courseRows.length > 0 && courseRows[0].lesson_content_document) {
          oldFilename = courseRows[0].lesson_content_document;
        }
      }
    }

    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.lessonDocument,
      [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt"]
    );

    console.log("Document uploaded with filename:", filename);

    if (lessonId) {
      // Update the appropriate table
      if (isStandalone) {
        console.log("Updating standalone_lessons table");
        await promisePool.query(
          "UPDATE standalone_lessons SET lesson_content_document = ? WHERE id = ?",
          [filename, lessonId]
        );
      } else {
        console.log("Updating course_lesson table");
        await promisePool.query(
          "UPDATE course_lesson SET lesson_content_document = ? WHERE id = ?",
          [filename, lessonId]
        );
      }

      // Delete old file after successful update
      if (oldFilename) {
        const oldFilePath = path.join(this.uploadPaths.lessonDocument, oldFilename);
        await this.deleteOldFile(oldFilePath);
      }
    }

    console.log("uploadLessonDocument completed successfully");
    return filename;
  }

  // Lesson MP4
  async uploadLessonMp4(file, lessonId) {
    console.log("uploadLessonMp4 called with lessonId:", lessonId);

    // Get old MP4 filename if updating
    let oldFilename = null;
    let isStandalone = false;

    if (lessonId) {
      // Check if it's a standalone lesson first
      const [standaloneRows] = await promisePool.query(
        "SELECT lesson_content_mp4 FROM standalone_lessons WHERE id = ?",
        [lessonId]
      );

      console.log("Standalone check result:", standaloneRows);

      if (standaloneRows.length > 0) {
        isStandalone = true;
        console.log("Lesson is STANDALONE");
        if (standaloneRows[0].lesson_content_mp4) {
          oldFilename = standaloneRows[0].lesson_content_mp4;
        }
      } else {
        // If not standalone, check course_lesson table
        console.log("Lesson not found in standalone_lessons, checking course_lesson");
        const [courseRows] = await promisePool.query(
          "SELECT lesson_content_mp4 FROM course_lesson WHERE id = ?",
          [lessonId]
        );
        if (courseRows.length > 0 && courseRows[0].lesson_content_mp4) {
          oldFilename = courseRows[0].lesson_content_mp4;
        }
      }
    }

    const filename = await this.uploadSingleFile(
      file,
      this.uploadPaths.lessonMp4,
      [".mp4"]
    );

    console.log("MP4 uploaded with filename:", filename);

    if (lessonId) {
      // Update the appropriate table
      if (isStandalone) {
        console.log("Updating standalone_lessons table");
        await promisePool.query(
          "UPDATE standalone_lessons SET lesson_content_mp4 = ? WHERE id = ?",
          [filename, lessonId]
        );
      } else {
        console.log("Updating course_lesson table");
        await promisePool.query(
          "UPDATE course_lesson SET lesson_content_mp4 = ? WHERE id = ?",
          [filename, lessonId]
        );
      }

      // Delete old file after successful update
      if (oldFilename) {
        const oldFilePath = path.join(this.uploadPaths.lessonMp4, oldFilename);
        await this.deleteOldFile(oldFilePath);
      }
    }

    console.log("uploadLessonMp4 completed successfully");
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
