const { promisePool } = require('../config/db');

class ActivityService {
  async logStudentSession(userId) {
    try {
      await promisePool.query('CALL log_student_session(?)', [userId]);
      return true;
    } catch (error) {
      throw new Error(`Failed to log session: ${error.message}`);
    }
  }

  async getStudentWeeklyHours(userId) {
    try {
      const [resultSets] = await promisePool.query('CALL get_student_weekly_hours(?)', [userId]);
      const rows = resultSets[0];

      const weeklyHours = rows.map(row => ({
        date: row.session_date,        
        day: row.day_name,           
        hours: parseFloat(parseFloat(row.total_hours).toFixed(2))  
      }));

      return weeklyHours;
    } catch (error) {
      throw new Error(`Failed to retrieve weekly hours: ${error.message}`);
    }
  }

  async getTotalStudentHours(userId) {
  try {
    const [resultSets] = await promisePool.query('CALL get_total_student_hours(?)', [userId]);
    const row = resultSets[0]?.[0];
    return {
      totalHours: row ? parseFloat(row.total_hours) : 0.0
    };
  } catch (error) {
    throw new Error(`Failed to retrieve total hours: ${error.message}`);
  }
}


}

module.exports = new ActivityService();
