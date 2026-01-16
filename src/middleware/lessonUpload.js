const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = {
  documents: path.join(__dirname, '../../uploads/lessons/documents'),
  videos: path.join(__dirname, '../../uploads/lessons/videos'),
  scorm: path.join(__dirname, '../../uploads/lessons/scorm'),
};

Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on content type from request body
    const contentType = req.body.contentType;
    let uploadDir = uploadDirs.documents; // default

    if (contentType === 'mp4') {
      uploadDir = uploadDirs.videos;
    } else if (contentType === 'scorm') {
      uploadDir = uploadDirs.scorm;
    } else if (contentType === 'document') {
      uploadDir = uploadDirs.documents;
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: courseId-lessonId-timestamp-originalname
    const courseId = req.params.courseId || 'course';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const filename = `${courseId}-lesson-${timestamp}-${basename}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const contentType = req.body.contentType;

  if (contentType === 'document') {
    // Accept PDF, DOC, DOCX
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed for documents'), false);
    }
  } else if (contentType === 'mp4') {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for mp4 content'), false);
    }
  } else if (contentType === 'scorm') {
    // Accept ZIP files
    const allowedMimes = ['application/zip', 'application/x-zip-compressed'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed for SCORM packages'), false);
    }
  } else {
    // URL type or unknown
    cb(null, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
});

// Export middleware for single file upload
module.exports = upload.single('lessonContent');
