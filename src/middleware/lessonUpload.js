const multer = require('multer');

// Configure multer with memory storage
// Files will be handled by the service layer which will save them properly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size per file
    files: 5000, // Max 5000 files (for SCORM folder uploads)
    fieldSize: 500 * 1024 * 1024, // 500MB for field data
    fields: 100, // Max 100 fields
  },
});

// Export middleware that handles both single file and multiple files
// Use upload.any() to accept all files, then organize them after
module.exports = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return next(err);
    }

    // After upload, organize files based on contentType
    if (req.files && req.files.length > 0) {
      const contentFiles = req.files.filter(f => f.fieldname === 'lessonContent');

      if (contentFiles.length === 1) {
        // Single file - set as req.file for compatibility
        req.file = contentFiles[0];
      } else if (contentFiles.length > 1) {
        // Multiple files - keep as req.files
        req.files = contentFiles;
      }
    }

    next();
  });
};
