const customReportService = require("../../services/admin/custom_report_service");
const geminiAIService = require("../../services/gemini/gemini_ai_service");
const asyncHandler = require("../../utils/asyncHandler");

exports.getDataSources = asyncHandler(async (req, res) => {
  const dataSources = customReportService.getDataSources();

  res.json({
    success: true,
    data: dataSources,
  });
});

exports.previewReport = asyncHandler(async (req, res) => {
  const result = await customReportService.buildReport(req.body);

  res.json({
    success: true,
    data: result,
  });
});

exports.exportReport = asyncHandler(async (req, res) => {
  const result = await customReportService.exportReport(req.body);

  res.json({
    success: true,
    message: "Report exported successfully",
    data: {
      fileName: result.fileName,
      format: result.format,
      size: result.size,
      recordCount: result.recordCount,
      downloadUrl: `/api/admin/reports/download/${result.fileName}`,
    },
  });
});

exports.aggregateReport = asyncHandler(async (req, res) => {
  const result = await customReportService.aggregateReport(req.body);

  res.json({
    success: true,
    data: result,
  });
});

exports.aiGenerateConfig = asyncHandler(async (req, res) => {
  const dataSources = customReportService.getDataSources();
  const config = await geminiAIService.generateReportConfig(
    req.body.prompt,
    dataSources
  );

  res.json({
    success: true,
    data: config,
  });
});

exports.aiGenerateInsights = asyncHandler(async (req, res) => {
  const { dataSource, fields, filters, sortBy, sortOrder, chartSummary } = req.body;

  const reportData = await customReportService.buildReport({
    dataSource,
    fields,
    filters: filters || [],
    groupBy: null,
    sortBy: sortBy || null,
    sortOrder: sortOrder || "asc",
    limit: 50,
    offset: 0,
  });

  const dataSources = customReportService.getDataSources();
  const sourceLabel = dataSources[dataSource]?.label || dataSource;

  const insights = await geminiAIService.generateReportInsights({
    dataSourceLabel: sourceLabel,
    data: reportData.data,
    fields: reportData.fields,
    totalRecords: reportData.totalRecords,
    chartSummary: chartSummary || null,
  });

  res.json({
    success: true,
    data: insights,
  });
});
