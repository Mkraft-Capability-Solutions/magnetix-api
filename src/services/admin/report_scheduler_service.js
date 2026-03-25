const { promisePool: pool } = require('../../config/db');

/**
 * Report Scheduler Service
 * Handles CRUD operations and schedule matching for automated report delivery
 */

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
    return rows.map(row => ({
      ...row,
      recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients
    }));
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

    const row = rows[0];
    return {
      ...row,
      recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients
    };
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
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      timezone = 'Asia/Kolkata',
      recipients,
      reportFormat = 'pdf',
      createdBy
    } = data;

    const [result] = await pool.query(
      `INSERT INTO report_schedules
        (report_type, frequency, day_of_week, day_of_month, time_of_day, timezone, recipients, report_format, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportType,
        frequency,
        frequency === 'weekly' ? dayOfWeek : null,
        frequency === 'monthly' ? dayOfMonth : null,
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
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      timezone,
      recipients,
      reportFormat
    } = data;

    await pool.query(
      `UPDATE report_schedules SET
        frequency = ?,
        day_of_week = ?,
        day_of_month = ?,
        time_of_day = ?,
        timezone = ?,
        recipients = ?,
        report_format = ?
       WHERE id = ?`,
      [
        frequency,
        frequency === 'weekly' ? dayOfWeek : null,
        frequency === 'monthly' ? dayOfMonth : null,
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
 * Compares schedule time against server-local time (Node.js process timezone).
 * This avoids reliance on MySQL CONVERT_TZ which requires timezone tables to be loaded.
 */
const getDueSchedules = async () => {
  try {
    // Build current time string in each schedule's expected format using Node.js
    // This works even when MySQL timezone tables are not loaded
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    const currentDayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    const currentDayOfMonth = now.getDate();

    const [rows] = await pool.query(`
      SELECT * FROM report_schedules
      WHERE is_active = 1
        AND (
          (frequency = 'daily')
          OR (frequency = 'weekly' AND day_of_week = ?)
          OR (frequency = 'monthly' AND day_of_month = ?)
        )
        AND TIME_FORMAT(time_of_day, '%H:%i') = ?
        AND (last_sent_at IS NULL OR last_sent_at < DATE_SUB(NOW(), INTERVAL 50 MINUTE))
    `, [currentDayOfWeek, currentDayOfMonth, currentTimeStr]);

    return rows.map(row => ({
      ...row,
      recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients
    }));
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
