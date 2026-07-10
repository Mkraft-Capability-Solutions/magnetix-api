const reportService = require('../../services/super_admin/report_service');
const path = require('path');
const fs = require('fs');

/**
 * Admin Report Controller
 * Handles all HTTP requests for admin report endpoints
 */

/**
 * Get leaderboard data
 * GET /api/admin/reports/leaderboard
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await reportService.getLeaderboard(limit ? parseInt(limit) : 50);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getLeaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard data',
      error: error.message
    });
  }
};

/**
 * Get department performance data
 * GET /api/admin/reports/department-performance
 */
exports.getDepartmentPerformance = async (req, res) => {
  try {
    const data = await reportService.getDepartmentPerformance();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getDepartmentPerformance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department performance data',
      error: error.message
    });
  }
};

/**
 * Get completion trends data
 * GET /api/admin/reports/completion-trends
 */
exports.getCompletionTrends = async (req, res) => {
  try {
    const data = await reportService.getCompletionTrends();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getCompletionTrends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch completion trends data',
      error: error.message
    });
  }
};

/**
 * Get certification distribution data
 * GET /api/admin/reports/certification-distribution
 */
exports.getCertificationDistribution = async (req, res) => {
  try {
    const data = await reportService.getCertificationDistribution();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getCertificationDistribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certification distribution data',
      error: error.message
    });
  }
};

/**
 * Get skills assessment data
 * GET /api/admin/reports/skills-assessment
 */
exports.getSkillsAssessment = async (req, res) => {
  try {
    const data = await reportService.getSkillsAssessmentData();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getSkillsAssessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skills assessment data',
      error: error.message
    });
  }
};

/**
 * Get all dashboard analytics data
 * GET /api/admin/reports/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const data = await reportService.getDashboardAnalytics();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getAnalytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
};

/**
 * Generate a report file
 * POST /api/admin/reports/generate
 * Body: { reportType, format, dateRange, department }
 */
exports.generateReport = async (req, res) => {
  try {
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
    const result = await reportService.generateReport(reportType, format, {
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
        downloadUrl: `/api/super-admin/reports/download/${result.fileName}`
      },
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Report Controller - generateReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

/**
 * Download a generated report file
 * GET /api/admin/reports/download/:fileName
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
    console.error('Report Controller - downloadReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download report',
      error: error.message
    });
  }
};

/**
 * Get user report preview data (for the report page table)
 * GET /api/admin/reports/user-data
 */
exports.getUserReportData = async (req, res) => {
  try {
    const { fromDate, toDate, department } = req.query;

    const data = await reportService.getUserReportData(
      fromDate || null,
      toDate || null,
      department || null
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getUserReportData error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user report data',
      error: error.message
    });
  }
};

/**
 * Get course completion report preview data
 * GET /api/admin/reports/course-completion-data
 */
exports.getCourseCompletionData = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const data = await reportService.getCourseCompletionData(
      fromDate || null,
      toDate || null
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getCourseCompletionData error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course completion data',
      error: error.message
    });
  }
};

// ===========================================================================
// EXTENDED ANALYTICS endpoints. Thin wrappers around the service; each returns
// { success, data }. Errors are logged and surfaced as 500 with a message.
// ===========================================================================

const analyticsHandler = (serviceFn, label) => async (req, res) => {
  try {
    const data = await serviceFn();
    res.json({ success: true, data });
  } catch (error) {
    console.error(`Report Controller - ${label} error:`, error);
    res.status(500).json({ success: false, message: `Failed to fetch ${label}`, error: error.message });
  }
};

exports.getKpiSummary = analyticsHandler(reportService.getKpiSummary, 'KPI summary');
exports.getDepartments = analyticsHandler(reportService.getDepartments, 'departments');
exports.getEnrollmentFunnel = analyticsHandler(reportService.getEnrollmentFunnel, 'enrollment funnel');
exports.getTimeDistribution = analyticsHandler(reportService.getTimeDistribution, 'time distribution');
exports.getActivityHeatmap = analyticsHandler(reportService.getActivityHeatmap, 'activity heatmap');
exports.getLevelDistribution = analyticsHandler(reportService.getLevelDistribution, 'level distribution');
exports.getCertificationExpiry = analyticsHandler(reportService.getCertificationExpiry, 'certification expiry');
exports.getAssessmentScores = analyticsHandler(reportService.getAssessmentScores, 'assessment scores');
exports.getCohortRetention = analyticsHandler(reportService.getCohortRetention, 'cohort retention');
exports.getTeamPerformance = analyticsHandler(reportService.getTeamPerformance, 'team performance');

/**
 * Get learning engagement report preview data
 * GET /api/admin/reports/learning-engagement-data
 */
exports.getLearningEngagementData = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const data = await reportService.getLearningEngagementData(
      fromDate || null,
      toDate || null
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Report Controller - getLearningEngagementData error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning engagement data',
      error: error.message
    });
  }
};
