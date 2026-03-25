const express = require("express");
const router = express.Router();
const customReportController = require("../../controllers/admin/custom_report_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");
const {
  validatePreviewReport,
  validateExportReport,
  validateAggregateReport,
  validateAiGenerateConfig,
  validateAiInsights,
} = require("../../validators/customReportValidator");

router.use(authenticate);
router.use(authorize(3, 4));

router.get("/data-sources", customReportController.getDataSources);

router.post("/preview", validatePreviewReport, customReportController.previewReport);

router.post("/export", validateExportReport, customReportController.exportReport);

router.post("/aggregate", validateAggregateReport, customReportController.aggregateReport);

router.post("/ai/generate-config", validateAiGenerateConfig, customReportController.aiGenerateConfig);

router.post("/ai/insights", validateAiInsights, customReportController.aiGenerateInsights);

module.exports = router;
