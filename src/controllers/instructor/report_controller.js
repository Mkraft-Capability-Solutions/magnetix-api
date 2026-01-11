const reportService = require('../../services/instructor/report_service');
const path = require('path');
const fs = require('fs');

/**
 * Instructor Report Controller
 * Handles all HTTP requests for instructor report endpoints
 * All endpoints filter data by instructor's courses only
 */

/**
 * Get leaderboard data for instructor's students
 * GET /api/instructor/reports/leaderboard
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { limit } = req.query;
    const data = await reportService.getLeaderboard(instructorId, limit ? parseInt(limit) : 50);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Report Controller - getLeaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard data',
      error: error.message
    });
  }
};

/**
 * Get department performance data for instructor's students
 * GET /api/instructor/reports/department-performance
 */
exports.getDepartmentPerformance = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await reportService.getDepartmentPerformance(instructorId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Report Controller - getDepartmentPerformance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department performance data',
      error: error.message
    });
  }
};

/**
 * Get completion trends data for instructor's courses
 * GET /api/instructor/reports/completion-trends
 */
exports.getCompletionTrends = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await reportService.getCompletionTrends(instructorId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Report Controller - getCompletionTrends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch completion trends data',
      error: error.message
    });
  }
};

/**
 * Get certification distribution data for instructor's courses
 * GET /api/instructor/reports/certification-distribution
 */
exports.getCertificationDistribution = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await reportService.getCertificationDistribution(instructorId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Report Controller - getCertificationDistribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certification distribution data',
      error: error.message
    });
  }
};

/**
 * Get skills assessment data for instructor's courses
 * GET /api/instructor/reports/skills-assessment
 */
exports.getSkillsAssessment = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await reportService.getSkillsAssessmentData(instructorId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Report Controller - getSkillsAssessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skills assessment data',
      error: error.message
    });
  }
};

/**
 * Generate a report file for instructor
 * POST /api/instructor/reports/generate
 * Body: { reportType, format, dateRange, department }
 */
exports.generateReport = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const { reportType, format, dateRange, department } = req.body;

    // Validate required fields
    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }

    if (!format) {
      return res.status(400).json({
        success: false,
        message: 'Format is required (pdf, excel, or csv)'
      });
    }

    // Validate report type
    const validReportTypes = ['user', 'course-completion', 'learning-engagement', 'skills-assessment'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      });
    }

    // Validate format
    const validFormats = ['pdf', 'excel', 'csv'];
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }

    // Generate the report
    const result = await reportService.generateReport(instructorId, reportType, format, {
      dateRange,
      department
    });

    res.json({
      success: true,
      data: {
        fileName: result.fileName,
        format: result.format,
        size: result.size,
        recordCount: result.recordCount,
        downloadUrl: `/api/instructor/reports/download/${result.fileName}`
      },
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Instructor Report Controller - generateReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

/**
 * Download a generated report file
 * GET /api/instructor/reports/download/:fileName
 */
exports.downloadReport = async (req, res) => {
  try {
    const { fileName } = req.params;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'File name is required'
      });
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFileName = path.basename(fileName);
    // Reports are stored in the uploads folder at the project root
    const reportsDir = path.join(__dirname, '../../../uploads/reports');
    const filePath = path.join(reportsDir, sanitizedFileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Report file not found'
      });
    }

    // Set content type based on file extension
    const ext = path.extname(sanitizedFileName).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.csv') contentType = 'text/csv';

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Instructor Report Controller - downloadReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download report',
      error: error.message
    });
  }
};
