const uploadService = require('../services/upload_service');

exports.uploadCourseThumbnail = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filename = await uploadService.uploadCourseThumbnail(req.file, req.body.courseId);
    
    res.json({ 
      success: true, 
      message: 'Course thumbnail uploaded successfully',
      filename 
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadEventThumbnail = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filename = await uploadService.uploadEventThumbnail(req.file, req.body.eventId);
    
    res.json({ 
      success: true, 
      message: 'Event thumbnail uploaded successfully',
      filename 
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadUserProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filename = await uploadService.uploadUserProfilePicture(req.file, req.user.uuid);
    
    res.json({ 
      success: true, 
      message: 'Profile picture uploaded successfully',
      filename 
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadCourseOverviewVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filename = await uploadService.uploadCourseOverviewVideo(req.file, req.body.courseId);
    
    res.json({ 
      success: true, 
      message: 'Course overview video uploaded successfully',
      filename 
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadCourseOverviewScorm = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const scormPath = await uploadService.uploadCourseOverviewScorm(req.file, req.body.courseId);
    
    res.json({ 
      success: true, 
      message: 'Course overview SCORM package uploaded successfully',
      scormPath 
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadLessonScorm = async (req, res, next) => {
  try {
    // Support both single ZIP file and multiple files (folder upload)
    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    if (!req.body.lessonId) {
      return res.status(400).json({ success: false, message: 'Lesson ID is required' });
    }

    let folderName;

    // Check if it's a folder upload (multiple files) or ZIP file (single file)
    if (req.files && req.files.length > 0) {
      // Multiple files - folder upload
      console.log('Uploading SCORM folder for lesson:', req.body.lessonId, 'Files:', req.files.length);
      folderName = await uploadService.uploadScormFolder(req.files, req.body.lessonId);
      console.log('SCORM folder upload successful:', folderName);
    } else if (req.file) {
      // Single ZIP file - extract it
      console.log('Uploading SCORM ZIP for lesson:', req.body.lessonId, 'File:', req.file.originalname);
      folderName = await uploadService.uploadLessonScorm(req.file, req.body.lessonId);
      console.log('SCORM ZIP upload and extraction successful:', folderName);
    }

    res.json({
      success: true,
      message: 'Lesson SCORM content uploaded successfully',
      data: { folderName }
    });
  } catch (error) {
    console.error('SCORM upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload SCORM package'
    });
  }
};

exports.uploadLessonDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filename = await uploadService.uploadLessonDocument(req.file, req.body.lessonId);

    res.json({
      success: true,
      message: 'Lesson document uploaded successfully',
      data: { filename }
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadLessonMp4 = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filename = await uploadService.uploadLessonMp4(req.file, req.body.lessonId);

    res.json({
      success: true,
      message: 'Lesson video uploaded successfully',
      data: { filename }
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadCertificate = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = await uploadService.uploadCertificate(req.file, req.user.uuid);

    res.json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: { filePath }
    });
  } catch (error) {
    next(error);
  }
};