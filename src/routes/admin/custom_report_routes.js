const express = require('express');
const router = express.Router();
const customReportController = require('../../controllers/admin/custom_report_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

/**
 * GET /api/admin/custom-reports/data-sources
 * Get available data sources and their fields
 */
router.get('/data-sources', customReportController.getDataSources);

/**
 * POST /api/admin/custom-reports/preview
 * Build and preview a custom report
 * Body: { dataSource, fields, filters, groupBy, sortBy, sortOrder, limit, offset }
 */
router.post('/preview', customReportController.previewReport);

/**
 * POST /api/admin/custom-reports/export
 * Export a custom report to file (PDF, Excel, CSV)
 * Body: { dataSource, fields, filters, groupBy, sortBy, sortOrder, format, reportName }
 */
router.post('/export', customReportController.exportReport);

/**
 * POST /api/admin/custom-reports/aggregate
 * Get aggregated data for chart visualizations
 * Body: { dataSource, groupByField, aggregateField, aggregateFunction, filters, limit }
 */
router.post('/aggregate', customReportController.aggregateReport);

/**
 * POST /api/admin/custom-reports/ai/generate-config
 * Generate report configuration from natural language using AI
 * Body: { prompt }
 */
router.post('/ai/generate-config', customReportController.aiGenerateConfig);

/**
 * POST /api/admin/custom-reports/ai/insights
 * Generate AI insights from report data
 * Body: { dataSource, fields, filters, sortBy, sortOrder, chartSummary }
 */
router.post('/ai/insights', customReportController.aiGenerateInsights);

module.exports = router;
