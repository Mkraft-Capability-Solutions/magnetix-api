const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/upload_controller');
const { authenticate, authorize } = require('../middleware/auth_middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    fieldSize: 500 * 1024 * 1024, // 500MB for field data
    files: 10, // max 10 files
    fields: 20 // max 20 fields
  },
  fileFilter: (req, file, cb) => {
    console.log('Upload file filter - File:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
    // Allow all file types for now, validation happens in services
    cb(null, true);
  },
  onError: (err, next) => {
    console.error('Multer error:', err);
    next(err);
  }
});

// Course uploads
router.post('/course/thumbnail', 
  authenticate,
  authorize(2,3), // Instructor only
  upload.single('thumbnail'),
  uploadController.uploadCourseThumbnail
);

router.post('/course/overview/video', 
  authenticate,
  authorize(2,3),
  upload.single('video'),
  uploadController.uploadCourseOverviewVideo
);

router.post('/course/overview/scorm', 
  authenticate,
  authorize(2,3),
  upload.single('scorm'),
  uploadController.uploadCourseOverviewScorm
);

// Event uploads
router.post('/event/thumbnail', 
  authenticate,
  authorize(2,3),
  upload.single('thumbnail'),
  uploadController.uploadEventThumbnail
);

// User uploads
router.post('/user/profile', 
  authenticate,
  upload.single('profile'),
  uploadController.uploadUserProfilePicture
);

// Lesson uploads
router.post('/lesson/scorm', 
  authenticate,
  authorize(2,3),
  (req, res, next) => {
    console.log('SCORM upload route - Request received');
    console.log('Headers:', req.headers);
    console.log('Content-Length:', req.headers['content-length']);
    next();
  },
  upload.single('scorm'),
  (req, res, next) => {
    console.log('SCORM upload - After multer processing');
    console.log('File received:', req.file ? req.file.originalname : 'No file');
    console.log('Body:', req.body);
    next();
  },
  uploadController.uploadLessonScorm
);

router.post('/lesson/document', 
  authenticate,
  authorize(2,3),
  upload.single('document'),
  uploadController.uploadLessonDocument
);

router.post('/lesson/mp4', 
  authenticate,
  authorize(2,3),
  upload.single('video'),
  uploadController.uploadLessonMp4
);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  console.error('Upload route error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`
    });
  }
  
  // Pass other errors to global error handler
  next(error);
});

module.exports = router;