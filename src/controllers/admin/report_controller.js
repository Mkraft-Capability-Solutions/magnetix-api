const reportService = require("../../services/admin/report_service");
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/appError");
const path = require("path");
const fs = require("fs");

const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
};

// ============================================================================
// ANALYTICS DATA ENDPOINTS
// ============================================================================

exports.getLeaderboard = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const data = await reportService.getLeaderboard(limit);
  res.json({ success: true, data });
});

exports.getDepartmentPerformance = asyncHandler(async (req, res) => {
  const data = await reportService.getDepartmentPerformance();
  res.json({ success: true, data });
});

exports.getCompletionTrends = asyncHandler(async (req, res) => {
  const data = await reportService.getCompletionTrends();
  res.json({ success: true, data });
});

exports.getCertificationDistribution = asyncHandler(async (req, res) => {
  const data = await reportService.getCertificationDistribution();
  res.json({ success: true, data });
});

exports.getSkillsAssessment = asyncHandler(async (req, res) => {
  const data = await reportService.getSkillsAssessmentData();
  res.json({ success: true, data });
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  const data = await reportService.getDashboardAnalytics();
  res.json({ success: true, data });
});

exports.getUserReportData = asyncHandler(async (req, res) => {
  const { fromDate, toDate, department } = req.query;
  const data = await reportService.getUserReportData(
    fromDate || null,
    toDate || null,
    department || null
  );
  res.json({ success: true, data });
});

exports.getCourseCompletionData = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.query;
  const data = await reportService.getCourseCompletionData(
    fromDate || null,
    toDate || null
  );
  res.json({ success: true, data });
});

exports.getLearningEngagementData = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.query;
  const data = await reportService.getLearningEngagementData(
    fromDate || null,
    toDate || null
  );
  res.json({ success: true, data });
});

exports.getLoginActivity = asyncHandler(async (req, res) => {
  const data = await reportService.getLoginActivity();
  res.json({ success: true, data });
});

exports.getEnrollmentTimeline = asyncHandler(async (req, res) => {
  const data = await reportService.getEnrollmentTimeline();
  res.json({ success: true, data });
});

exports.getCategoryBreakdown = asyncHandler(async (req, res) => {
  const data = await reportService.getCategoryBreakdown();
  res.json({ success: true, data });
});

exports.getProgressDistribution = asyncHandler(async (req, res) => {
  const data = await reportService.getProgressDistribution();
  res.json({ success: true, data });
});

exports.getUserGrowth = asyncHandler(async (req, res) => {
  const data = await reportService.getUserGrowth();
  res.json({ success: true, data });
});

exports.getRoleDistribution = asyncHandler(async (req, res) => {
  const data = await reportService.getRoleDistribution();
  res.json({ success: true, data });
});

exports.getActivityHeatmap = asyncHandler(async (req, res) => {
  const data = await reportService.getActivityHeatmap();
  res.json({ success: true, data });
});

// ============================================================================
// REPORT GENERATION & DOWNLOAD
// ============================================================================

exports.generateReport = asyncHandler(async (req, res) => {
  const { reportType, format, dateRange, department } = req.body;

  const result = await reportService.generateReport(reportType, format, {
    dateRange,
    department,
  });

  res.json({
    success: true,
    message: "Report generated successfully",
    data: {
      fileName: result.fileName,
      format: result.format,
      size: result.size,
      recordCount: result.recordCount,
      downloadUrl: `/api/admin/reports/download/${result.fileName}`,
    },
  });
});

exports.downloadReport = asyncHandler(async (req, res) => {
  const { fileName } = req.params;

  if (!fileName) {
    throw new AppError("File name is required", 400);
  }

  const sanitizedFileName = path.basename(fileName);
  const reportsDir = path.join(__dirname, "../../../uploads/reports");
  const filePath = path.join(reportsDir, sanitizedFileName);

  if (!fs.existsSync(filePath)) {
    throw new AppError("Report file not found", 404);
  }

  const ext = path.extname(sanitizedFileName).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${sanitizedFileName}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});
