const express = require('express');
const router = express.Router();
const multer = require('multer');
const bulkUploadController = require('../../controllers/super_admin/bulk_upload_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Apply authentication and authorization to all routes
router.use(authenticate);
router.use(authorize(4)); // Only SuperAdmin (4)

/**
 * POST /api/super-admin/bulk-upload/users
 * Upload users CSV file and create user accounts
 * Body: multipart/form-data with 'file' field
 */
router.post('/users',
  upload.single('file'),
  bulkUploadController.uploadUsers
);

/**
 * POST /api/super-admin/bulk-upload/content
 * Upload content updates CSV file and update course metadata
 * Body: multipart/form-data with 'file' field
 */
router.post('/content',
  upload.single('file'),
  bulkUploadController.uploadContent
);

/**
 * POST /api/super-admin/bulk-upload/assignments
 * Upload course assignments CSV file and enroll users
 * Body: multipart/form-data with 'file' field
 */
router.post('/assignments',
  upload.single('file'),
  bulkUploadController.uploadAssignments
);

/**
 * GET /api/super-admin/bulk-upload/template/:type
 * Download CSV template for a given type
 * Params: type = 'users' | 'content' | 'assignments'
 */
router.get('/template/:type',
  bulkUploadController.downloadTemplate
);

/**
 * GET /api/super-admin/bulk-upload/sample/:type
 * Download sample CSV file with example data
 * Params: type = 'users' | 'content' | 'assignments'
 */
router.get('/sample/:type',
  bulkUploadController.downloadSample
);

module.exports = router;
