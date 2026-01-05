const bulkUploadService = require('../../services/admin/bulk_upload_service');
const { generateCSVTemplate, generateSampleCSV } = require('../../utils/csv_parser');

// ==============================================
// UPLOAD USERS CONTROLLER
// ==============================================

exports.uploadUsers = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type
    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only CSV files are allowed'
      });
    }

    // Validate file size (10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit'
      });
    }

    // Process upload
    const result = await bulkUploadService.uploadUsers(req.file.buffer);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Upload users controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload users',
      error: error.message
    });
  }
};

// ==============================================
// UPLOAD CONTENT UPDATES CONTROLLER
// ==============================================

exports.uploadContent = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type
    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only CSV files are allowed'
      });
    }

    // Validate file size (10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit'
      });
    }

    // Process upload
    const result = await bulkUploadService.uploadContentUpdates(req.file.buffer);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Upload content controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload content updates',
      error: error.message
    });
  }
};

// ==============================================
// UPLOAD ASSIGNMENTS CONTROLLER
// ==============================================

exports.uploadAssignments = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type
    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only CSV files are allowed'
      });
    }

    // Validate file size (10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit'
      });
    }

    // Process upload
    const result = await bulkUploadService.uploadAssignments(req.file.buffer);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Upload assignments controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload assignments',
      error: error.message
    });
  }
};

// ==============================================
// DOWNLOAD TEMPLATE CONTROLLER
// ==============================================

exports.downloadTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    // Validate type
    const validTypes = ['users', 'content', 'assignments'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template type. Allowed: ${validTypes.join(', ')}`
      });
    }

    // Generate template
    const template = generateCSVTemplate(type);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);

    // Send template
    res.send(template);
  } catch (error) {
    console.error('Download template controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download template',
      error: error.message
    });
  }
};

// ==============================================
// DOWNLOAD SAMPLE CONTROLLER
// ==============================================

exports.downloadSample = async (req, res) => {
  try {
    const { type } = req.params;

    // Validate type
    const validTypes = ['users', 'content', 'assignments'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sample type. Allowed: ${validTypes.join(', ')}`
      });
    }

    // Generate sample
    const sample = generateSampleCSV(type);

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_sample.csv"`);

    // Send sample
    res.send(sample);
  } catch (error) {
    console.error('Download sample controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download sample',
      error: error.message
    });
  }
};
