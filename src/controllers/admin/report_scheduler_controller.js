const reportSchedulerService = require('../../services/admin/report_scheduler_service');
const geminiAIService = require('../../services/gemini/gemini_ai_service');

/**
 * Report Scheduler Controller
 * Handles HTTP requests for report schedule CRUD operations
 */

const VALID_FREQUENCIES = ['once', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'custom'];

/**
 * GET /api/admin/reports/schedules
 * List all report schedules
 */
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await reportSchedulerService.getAllSchedules();
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('ReportSchedulerController - getSchedules error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedules', error: error.message });
  }
};

/**
 * POST /api/admin/reports/schedules
 * Create a new report schedule
 */
exports.createSchedule = async (req, res) => {
  try {
    const {
      scheduleName, frequency, dayOfWeek, dayOfMonth,
      daysOfWeek, daysOfMonth, specificDates, repeatEndDate,
      timeOfDay, timezone, recipients, reportFormat
    } = req.body;

    if (!frequency || !timeOfDay || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'frequency, timeOfDay, and at least one recipient email are required'
      });
    }

    if (!VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`
      });
    }

    // Validate weekly/biweekly have day selection
    if ((frequency === 'weekly' || frequency === 'biweekly')) {
      const hasDays = (daysOfWeek && daysOfWeek.length > 0) || dayOfWeek != null;
      if (!hasDays) {
        return res.status(400).json({
          success: false,
          message: 'At least one day of week is required for weekly/biweekly schedules'
        });
      }
    }

    // Validate monthly has day selection
    if (frequency === 'monthly') {
      const hasDays = (daysOfMonth && daysOfMonth.length > 0) || dayOfMonth != null;
      if (!hasDays) {
        return res.status(400).json({
          success: false,
          message: 'At least one day of month is required for monthly schedules'
        });
      }
    }

    // Validate once/custom has specific dates
    if ((frequency === 'once' || frequency === 'custom') && (!specificDates || specificDates.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one specific date is required for once/custom schedules'
      });
    }

    const schedule = await reportSchedulerService.createSchedule({
      reportType: 'analytics',
      scheduleName,
      frequency,
      dayOfWeek,
      dayOfMonth,
      daysOfWeek,
      daysOfMonth,
      specificDates,
      repeatEndDate,
      timeOfDay,
      timezone,
      recipients,
      reportFormat,
      createdBy: req.user.uuid
    });

    res.status(201).json({ success: true, data: schedule, message: 'Schedule created successfully' });
  } catch (error) {
    console.error('ReportSchedulerController - createSchedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to create schedule', error: error.message });
  }
};

/**
 * PUT /api/admin/reports/schedules/:id
 * Update an existing schedule
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      scheduleName, frequency, dayOfWeek, dayOfMonth,
      daysOfWeek, daysOfMonth, specificDates, repeatEndDate,
      timeOfDay, timezone, recipients, reportFormat
    } = req.body;

    const existing = await reportSchedulerService.getScheduleById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    if (!frequency || !timeOfDay || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'frequency, timeOfDay, and at least one recipient email are required'
      });
    }

    if (!VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`
      });
    }

    const schedule = await reportSchedulerService.updateSchedule(id, {
      scheduleName,
      frequency,
      dayOfWeek,
      dayOfMonth,
      daysOfWeek,
      daysOfMonth,
      specificDates,
      repeatEndDate,
      timeOfDay,
      timezone,
      recipients,
      reportFormat
    });

    res.json({ success: true, data: schedule, message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('ReportSchedulerController - updateSchedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to update schedule', error: error.message });
  }
};

/**
 * DELETE /api/admin/reports/schedules/:id
 * Delete a schedule
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await reportSchedulerService.deleteSchedule(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('ReportSchedulerController - deleteSchedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete schedule', error: error.message });
  }
};

/**
 * PATCH /api/admin/reports/schedules/:id/toggle
 * Toggle schedule active/inactive
 */
exports.toggleSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive (boolean) is required' });
    }

    const existing = await reportSchedulerService.getScheduleById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const schedule = await reportSchedulerService.toggleSchedule(id, isActive);
    res.json({ success: true, data: schedule, message: `Schedule ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('ReportSchedulerController - toggleSchedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle schedule', error: error.message });
  }
};

/**
 * POST /api/admin/reports/schedules/ai-parse
 * Parse a natural language command into a schedule configuration using AI
 */
exports.aiParseSchedule = async (req, res) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string' || command.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A schedule command text is required'
      });
    }

    const result = await geminiAIService.parseScheduleCommand(command.trim());
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('ReportSchedulerController - aiParseSchedule error:', error);

    const statusCode = error.message.includes('CONTENT_FILTERED') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: 'Failed to parse schedule command',
      error: error.message
    });
  }
};
