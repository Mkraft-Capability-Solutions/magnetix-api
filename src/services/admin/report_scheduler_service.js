const { promisePool: pool } = require('../../config/db');

/**
 * Report Scheduler Service
 * Handles CRUD operations and schedule matching for automated report delivery
 * Supports flexible scheduling: once, daily, weekdays, weekly, biweekly, monthly, custom dates
 */

const parseJSON = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return val || null;
};

const normalizeRow = (row) => ({
  ...row,
  recipients: parseJSON(row.recipients) || [],
  days_of_week: parseJSON(row.days_of_week),
  days_of_month: parseJSON(row.days_of_month),
  specific_dates: parseJSON(row.specific_dates),
});

/**
 * Get all schedules (optionally filtered by creator)
 */
const getAllSchedules = async (userId = null) => {
  try {
    let query = `
      SELECT rs.*, u.email as creator_email,
        COALESCE(a.first_name, sa.first_name) as first_name,
        COALESCE(a.last_name, sa.last_name) as last_name
      FROM report_schedules rs
      JOIN users u ON rs.created_by = u.uuid
      LEFT JOIN admins a ON a.user_id = u.uuid
      LEFT JOIN super_admins sa ON sa.user_id = u.uuid
    `;
    const params = [];

    if (userId) {
      query += ' WHERE rs.created_by = ?';
      params.push(userId);
    }

    query += ' ORDER BY rs.created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows.map(normalizeRow);
  } catch (error) {
    console.error('ReportSchedulerService - getAllSchedules error:', error);
    throw error;
  }
};

/**
 * Get a single schedule by ID
 */
const getScheduleById = async (id) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM report_schedules WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return normalizeRow(rows[0]);
  } catch (error) {
    console.error('ReportSchedulerService - getScheduleById error:', error);
    throw error;
  }
};

/**
 * Create a new report schedule
 */
const createSchedule = async (data) => {
  try {
    const {
      reportType = 'analytics',
      scheduleName = null,
      frequency,
      dayOfWeek,
      dayOfMonth,
      daysOfWeek,
      daysOfMonth,
      specificDates,
      repeatEndDate = null,
      timeOfDay,
      timezone = 'Asia/Kolkata',
      recipients,
      reportFormat = 'pdf',
      createdBy
    } = data;

    // For backward compat: if daysOfWeek not provided but dayOfWeek is, wrap it
    const resolvedDaysOfWeek = daysOfWeek || (frequency === 'weekly' || frequency === 'biweekly' ? (dayOfWeek != null ? [dayOfWeek] : null) : null);
    const resolvedDaysOfMonth = daysOfMonth || (frequency === 'monthly' ? (dayOfMonth != null ? [dayOfMonth] : null) : null);

    const [result] = await pool.query(
      `INSERT INTO report_schedules
        (report_type, schedule_name, frequency, day_of_week, day_of_month, days_of_week, days_of_month, specific_dates, repeat_end_date, time_of_day, timezone, recipients, report_format, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportType,
        scheduleName,
        frequency,
        // Keep legacy columns populated for backward compat
        resolvedDaysOfWeek ? resolvedDaysOfWeek[0] : null,
        resolvedDaysOfMonth ? resolvedDaysOfMonth[0] : null,
        resolvedDaysOfWeek ? JSON.stringify(resolvedDaysOfWeek) : null,
        resolvedDaysOfMonth ? JSON.stringify(resolvedDaysOfMonth) : null,
        specificDates ? JSON.stringify(specificDates) : null,
        repeatEndDate || null,
        timeOfDay,
        timezone,
        JSON.stringify(recipients),
        reportFormat,
        createdBy
      ]
    );

    return getScheduleById(result.insertId);
  } catch (error) {
    console.error('ReportSchedulerService - createSchedule error:', error);
    throw error;
  }
};

/**
 * Update an existing schedule
 */
const updateSchedule = async (id, data) => {
  try {
    const {
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
    } = data;

    const resolvedDaysOfWeek = daysOfWeek || (frequency === 'weekly' || frequency === 'biweekly' ? (dayOfWeek != null ? [dayOfWeek] : null) : null);
    const resolvedDaysOfMonth = daysOfMonth || (frequency === 'monthly' ? (dayOfMonth != null ? [dayOfMonth] : null) : null);

    await pool.query(
      `UPDATE report_schedules SET
        schedule_name = ?,
        frequency = ?,
        day_of_week = ?,
        day_of_month = ?,
        days_of_week = ?,
        days_of_month = ?,
        specific_dates = ?,
        repeat_end_date = ?,
        time_of_day = ?,
        timezone = ?,
        recipients = ?,
        report_format = ?
       WHERE id = ?`,
      [
        scheduleName !== undefined ? scheduleName : null,
        frequency,
        resolvedDaysOfWeek ? resolvedDaysOfWeek[0] : null,
        resolvedDaysOfMonth ? resolvedDaysOfMonth[0] : null,
        resolvedDaysOfWeek ? JSON.stringify(resolvedDaysOfWeek) : null,
        resolvedDaysOfMonth ? JSON.stringify(resolvedDaysOfMonth) : null,
        specificDates ? JSON.stringify(specificDates) : null,
        repeatEndDate || null,
        timeOfDay,
        timezone,
        JSON.stringify(recipients),
        reportFormat,
        id
      ]
    );

    return getScheduleById(id);
  } catch (error) {
    console.error('ReportSchedulerService - updateSchedule error:', error);
    throw error;
  }
};

/**
 * Delete a schedule
 */
const deleteSchedule = async (id) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM report_schedules WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('ReportSchedulerService - deleteSchedule error:', error);
    throw error;
  }
};

/**
 * Toggle schedule active/inactive
 */
const toggleSchedule = async (id, isActive) => {
  try {
    await pool.query(
      'UPDATE report_schedules SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
    return getScheduleById(id);
  } catch (error) {
    console.error('ReportSchedulerService - toggleSchedule error:', error);
    throw error;
  }
};

/**
 * Get schedules that are due to run right now.
 * Supports all frequency types: once, daily, weekdays, weekly, biweekly, monthly, custom.
 */
const getDueSchedules = async () => {
  try {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    const currentDayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    const currentDayOfMonth = now.getDate();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const isWeekday = currentDayOfWeek >= 1 && currentDayOfWeek <= 5;

    // Get week number for biweekly calculation (weeks since epoch)
    const epochStart = new Date(2024, 0, 1); // Fixed reference point
    const weeksSinceEpoch = Math.floor((now - epochStart) / (7 * 24 * 60 * 60 * 1000));
    const isEvenWeek = weeksSinceEpoch % 2 === 0;

    // Fetch all active schedules that match the current time and haven't been sent recently
    const [rows] = await pool.query(`
      SELECT * FROM report_schedules
      WHERE is_active = 1
        AND TIME_FORMAT(time_of_day, '%H:%i') = ?
        AND (last_sent_at IS NULL OR last_sent_at < DATE_SUB(NOW(), INTERVAL 50 MINUTE))
        AND (repeat_end_date IS NULL OR repeat_end_date >= CURDATE())
    `, [currentTimeStr]);

    // Filter in JS for complex matching (JSON columns, biweekly logic, etc.)
    const dueSchedules = rows.filter(row => {
      const schedule = normalizeRow(row);

      switch (schedule.frequency) {
        case 'daily':
          return true;

        case 'weekdays':
          return isWeekday;

        case 'weekly': {
          const days = schedule.days_of_week || (schedule.day_of_week != null ? [schedule.day_of_week] : []);
          return days.includes(currentDayOfWeek);
        }

        case 'biweekly': {
          const days = schedule.days_of_week || (schedule.day_of_week != null ? [schedule.day_of_week] : []);
          return isEvenWeek && days.includes(currentDayOfWeek);
        }

        case 'monthly': {
          const days = schedule.days_of_month || (schedule.day_of_month != null ? [schedule.day_of_month] : []);
          return days.includes(currentDayOfMonth);
        }

        case 'once':
        case 'custom': {
          const dates = schedule.specific_dates || [];
          return dates.includes(todayStr);
        }

        default:
          return false;
      }
    });

    return dueSchedules.map(normalizeRow);
  } catch (error) {
    console.error('ReportSchedulerService - getDueSchedules error:', error);
    throw error;
  }
};

/**
 * Update last_sent_at timestamp after successful send
 */
const markAsSent = async (id) => {
  try {
    await pool.query(
      'UPDATE report_schedules SET last_sent_at = NOW() WHERE id = ?',
      [id]
    );
  } catch (error) {
    console.error('ReportSchedulerService - markAsSent error:', error);
    throw error;
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getDueSchedules,
  markAsSent
};
