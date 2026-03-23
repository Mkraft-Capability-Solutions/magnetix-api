const customReportService = require('../../services/admin/custom_report_service');
const geminiAIService = require('../../services/gemini/gemini_ai_service');

/**
 * Custom Report Builder Controller
 * Handles HTTP requests for the custom report builder feature
 */

/**
 * Get available data sources and fields
 * GET /api/admin/custom-reports/data-sources
 */
exports.getDataSources = async (req, res) => {
  try {
    const dataSources = customReportService.getDataSources();

    res.json({
      success: true,
      data: dataSources,
    });
  } catch (error) {
    console.error('Custom Report Controller - getDataSources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data sources',
      error: error.message,
    });
  }
};

/**
 * Build and preview a custom report
 * POST /api/admin/custom-reports/preview
 * Body: { dataSource, fields, filters, groupBy, sortBy, sortOrder, limit, offset }
 */
exports.previewReport = async (req, res) => {
  try {
    const { dataSource, fields, filters, groupBy, sortBy, sortOrder, limit, offset } = req.body;

    if (!dataSource) {
      return res.status(400).json({
        success: false,
        message: 'Data source is required',
      });
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be selected',
      });
    }

    const result = await customReportService.buildReport({
      dataSource,
      fields,
      filters: filters || [],
      groupBy: groupBy || null,
      sortBy: sortBy || null,
      sortOrder: sortOrder || 'asc',
      limit: limit || 50,
      offset: offset || 0,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Custom Report Controller - previewReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to build report',
      error: error.message,
    });
  }
};

/**
 * Export a custom report to file
 * POST /api/admin/custom-reports/export
 * Body: { dataSource, fields, filters, groupBy, sortBy, sortOrder, format, reportName }
 */
exports.exportReport = async (req, res) => {
  try {
    const { dataSource, fields, filters, groupBy, sortBy, sortOrder, format, reportName } = req.body;

    if (!dataSource) {
      return res.status(400).json({
        success: false,
        message: 'Data source is required',
      });
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be selected',
      });
    }

    const validFormats = ['pdf', 'excel', 'csv'];
    const exportFormat = (format || 'pdf').toLowerCase();
    if (!validFormats.includes(exportFormat)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
      });
    }

    const result = await customReportService.exportReport({
      dataSource,
      fields,
      filters: filters || [],
      groupBy: groupBy || null,
      sortBy: sortBy || null,
      sortOrder: sortOrder || 'asc',
      format: exportFormat,
      reportName: reportName || null,
    });

    res.json({
      success: true,
      data: {
        fileName: result.fileName,
        format: result.format,
        size: result.size,
        recordCount: result.recordCount,
        downloadUrl: `/api/admin/reports/download/${result.fileName}`,
      },
      message: 'Report exported successfully',
    });
  } catch (error) {
    console.error('Custom Report Controller - exportReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message,
    });
  }
};

/**
 * Get aggregated data for chart visualizations
 * POST /api/admin/custom-reports/aggregate
 * Body: { dataSource, groupByField, aggregateField, aggregateFunction, filters, limit }
 */
exports.aggregateReport = async (req, res) => {
  try {
    const { dataSource, groupByField, aggregateField, aggregateFunction, filters, limit } = req.body;

    if (!dataSource) {
      return res.status(400).json({
        success: false,
        message: 'Data source is required',
      });
    }

    if (!groupByField) {
      return res.status(400).json({
        success: false,
        message: 'Group by field is required',
      });
    }

    const validFunctions = ['count', 'sum', 'avg', 'min', 'max'];
    if (aggregateFunction && !validFunctions.includes(aggregateFunction.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid aggregate function. Must be one of: ${validFunctions.join(', ')}`,
      });
    }

    const result = await customReportService.aggregateReport({
      dataSource,
      groupByField,
      aggregateField: aggregateField || null,
      aggregateFunction: aggregateFunction || 'count',
      filters: filters || [],
      limit: limit || 10,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Custom Report Controller - aggregateReport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate report data',
      error: error.message,
    });
  }
};

/**
 * Generate report configuration from natural language using AI
 * POST /api/admin/custom-reports/ai/generate-config
 * Body: { prompt }
 */
exports.aiGenerateConfig = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a report description (at least 5 characters)',
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Description is too long (max 1000 characters)',
      });
    }

    const dataSources = customReportService.getDataSources();
    const config = await geminiAIService.generateReportConfig(prompt.trim(), dataSources);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Custom Report Controller - aiGenerateConfig error:', error);

    const status = error.message.startsWith('CONTENT_FILTERED') ? 400
      : error.message.startsWith('AI_NOT_CONFIGURED') ? 503
      : 500;

    res.status(status).json({
      success: false,
      message: error.message.includes(':')
        ? error.message.split(':').slice(1).join(':').trim()
        : 'Failed to generate report configuration',
      error: error.message,
    });
  }
};

/**
 * Generate AI insights from report data
 * POST /api/admin/custom-reports/ai/insights
 * Body: { dataSource, fields, filters, sortBy, sortOrder, chartSummary }
 */
exports.aiGenerateInsights = async (req, res) => {
  try {
    const { dataSource, fields, filters, sortBy, sortOrder, chartSummary } = req.body;

    if (!dataSource) {
      return res.status(400).json({
        success: false,
        message: 'Data source is required',
      });
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be selected',
      });
    }

    // Fetch a data sample for analysis (first 50 rows)
    const reportData = await customReportService.buildReport({
      dataSource,
      fields,
      filters: filters || [],
      groupBy: null,
      sortBy: sortBy || null,
      sortOrder: sortOrder || 'asc',
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
  } catch (error) {
    console.error('Custom Report Controller - aiGenerateInsights error:', error);

    const status = error.message.startsWith('CONTENT_FILTERED') ? 400
      : error.message.startsWith('AI_NOT_CONFIGURED') ? 503
      : 500;

    res.status(status).json({
      success: false,
      message: error.message.includes(':')
        ? error.message.split(':').slice(1).join(':').trim()
        : 'Failed to generate insights',
      error: error.message,
    });
  }
};
