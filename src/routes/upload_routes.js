const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/upload_controller');
const { authenticate, authorize } = require('../middleware/auth_middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Course uploads
router.post('/course/thumbnail', 
  authenticate,
  authorize(2,3), // Instructor only
  upload.single('file'),
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
  upload.single('scorm'),
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

module.exports = router;