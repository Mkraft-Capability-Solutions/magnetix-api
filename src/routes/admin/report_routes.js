const express = require("express");
const router = express.Router();
const reportController = require("../../controllers/admin/report_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");
const { validateGenerateReport } = require("../../validators/reportAnalyticsValidator");

router.use(authenticate);
router.use(authorize(3, 4));

// Analytics data endpoints
router.get("/leaderboard", reportController.getLeaderboard);
router.get("/department-performance", reportController.getDepartmentPerformance);
router.get("/completion-trends", reportController.getCompletionTrends);
router.get("/certification-distribution", reportController.getCertificationDistribution);
router.get("/skills-assessment", reportController.getSkillsAssessment);
router.get("/analytics", reportController.getAnalytics);

// Report preview data endpoints
router.get("/user-data", reportController.getUserReportData);
router.get("/course-completion-data", reportController.getCourseCompletionData);
router.get("/learning-engagement-data", reportController.getLearningEngagementData);

// Additional analytics endpoints
router.get("/login-activity", reportController.getLoginActivity);
router.get("/enrollment-timeline", reportController.getEnrollmentTimeline);
router.get("/category-breakdown", reportController.getCategoryBreakdown);
router.get("/progress-distribution", reportController.getProgressDistribution);
router.get("/user-growth", reportController.getUserGrowth);
router.get("/role-distribution", reportController.getRoleDistribution);
router.get("/activity-heatmap", reportController.getActivityHeatmap);

// Report generation & download
router.post("/generate", validateGenerateReport, reportController.generateReport);
router.get("/download/:fileName", reportController.downloadReport);

module.exports = router;
