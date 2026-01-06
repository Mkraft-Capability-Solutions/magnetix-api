const { promisePool: pool } = require('../../config/db');

/**
 * Debug Controller for Instructor Dashboard
 * Provides diagnostic endpoints to troubleshoot data issues
 */

/**
 * Get comprehensive debug information
 * GET /api/instructor/dashboard/debug
 */
exports.getDebugInfo = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required (not logged in?)'
      });
    }

    console.log('🔍 DEBUG: Fetching debug info for instructor:', instructorId);

    // 1. Check instructor user exists
    const [instructorCheck] = await pool.query(
      `SELECT uuid, email, role_id, first_name, last_name FROM users WHERE uuid = ?`,
      [instructorId]
    );

    // 2. Count courses by this instructor
    const [coursesCount] = await pool.query(
      `SELECT COUNT(*) as count FROM course WHERE creator_id = ? AND is_deleted = 0`,
      [instructorId]
    );

    // 3. Get sample courses
    const [sampleCourses] = await pool.query(
      `SELECT id, title, status, created_at FROM course WHERE creator_id = ? AND is_deleted = 0 LIMIT 5`,
      [instructorId]
    );

    // 4. Count enrollments
    const [enrollmentsCount] = await pool.query(
      `SELECT COUNT(*) as count
       FROM enrol e
       INNER JOIN course c ON e.course_id = c.id
       WHERE c.creator_id = ? AND c.is_deleted = 0`,
      [instructorId]
    );

    // 5. Count distinct students
    const [studentsCount] = await pool.query(
      `SELECT COUNT(DISTINCT e.user_id) as count
       FROM enrol e
       INNER JOIN course c ON e.course_id = c.id
       WHERE c.creator_id = ? AND c.is_deleted = 0`,
      [instructorId]
    );

    // 6. Count tasks
    const [tasksCount] = await pool.query(
      `SELECT COUNT(*) as count FROM instructor_tasks WHERE instructor_id = ?`,
      [instructorId]
    );

    // 7. Count learning hours
    const [hoursCount] = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(hours_spent), 0) as total_hours
       FROM learning_hours_log lhl
       INNER JOIN enrol e ON lhl.user_id = e.user_id AND lhl.course_id = e.course_id
       INNER JOIN course c ON e.course_id = c.id
       WHERE c.creator_id = ?`,
      [instructorId]
    );

    // 8. Check database totals (all instructors)
    const [totalCoursesDB] = await pool.query(
      `SELECT COUNT(*) as count FROM course WHERE is_deleted = 0`
    );

    const [totalEnrollmentsDB] = await pool.query(
      `SELECT COUNT(*) as count FROM enrol`
    );

    const [totalTasksDB] = await pool.query(
      `SELECT COUNT(*) as count FROM instructor_tasks`
    );

    const [totalHoursDB] = await pool.query(
      `SELECT COUNT(*) as count FROM learning_hours_log`
    );

    // Return comprehensive debug info
    res.json({
      success: true,
      debug: {
        requestTime: new Date().toISOString(),
        instructorInfo: {
          instructorId,
          exists: instructorCheck.length > 0,
          details: instructorCheck[0] || null,
          role: instructorCheck[0]?.role_id === 2 ? 'Instructor ✓' : `Wrong role (${instructorCheck[0]?.role_id})`,
        },
        instructorData: {
          totalCourses: coursesCount[0]?.count || 0,
          sampleCourses: sampleCourses,
          totalEnrollments: enrollmentsCount[0]?.count || 0,
          totalStudents: studentsCount[0]?.count || 0,
          totalTasks: tasksCount[0]?.count || 0,
          totalHoursLogs: hoursCount[0]?.count || 0,
          totalHours: hoursCount[0]?.total_hours || 0,
        },
        databaseTotals: {
          allCourses: totalCoursesDB[0]?.count || 0,
          allEnrollments: totalEnrollmentsDB[0]?.count || 0,
          allTasks: totalTasksDB[0]?.count || 0,
          allHoursLogs: totalHoursDB[0]?.count || 0,
        },
        diagnosis: {
          hasData: (coursesCount[0]?.count || 0) > 0,
          issues: [],
          recommendations: []
        }
      }
    });

    // Add diagnosis
    const debugData = res.req.body || {};
    if (!instructorCheck.length) {
      debugData.diagnosis.issues.push('Instructor user not found in database');
    }
    if (instructorCheck[0]?.role_id !== 2) {
      debugData.diagnosis.issues.push('User is not an instructor (role_id should be 2)');
      debugData.diagnosis.recommendations.push('Run: UPDATE users SET role_id = 2 WHERE uuid = \'' + instructorId + '\';');
    }
    if ((coursesCount[0]?.count || 0) === 0) {
      debugData.diagnosis.issues.push('No courses created by this instructor');
      debugData.diagnosis.recommendations.push('Run seed_instructor_test_data.sql to create test data');
    }
    if ((totalCoursesDB[0]?.count || 0) === 0) {
      debugData.diagnosis.issues.push('No courses in entire database');
      debugData.diagnosis.recommendations.push('Database appears empty - run seed_instructor_test_data.sql');
    }

  } catch (error) {
    console.error('Debug Controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debug information',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Test database connection
 * GET /api/instructor/dashboard/debug/connection
 */
exports.testConnection = async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 + 1 AS result, DATABASE() as db_name, NOW() as server_time');

    res.json({
      success: true,
      connection: {
        status: 'Connected ✓',
        database: result[0].db_name,
        serverTime: result[0].server_time,
        testQuery: result[0].result === 2 ? 'Passed ✓' : 'Failed ✗'
      }
    });
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      success: false,
      connection: {
        status: 'Failed ✗',
        error: error.message
      }
    });
  }
};

/**
 * Get raw table counts
 * GET /api/instructor/dashboard/debug/tables
 */
exports.getTableCounts = async (req, res) => {
  try {
    const tables = ['users', 'course', 'enrol', 'instructor_tasks', 'learning_hours_log'];
    const counts = {};

    for (const table of tables) {
      try {
        const [result] = await pool.query(`SELECT COUNT(*) as count FROM ??`, [table]);
        counts[table] = result[0].count;
      } catch (error) {
        counts[table] = `Error: ${error.message}`;
      }
    }

    res.json({
      success: true,
      tableCounts: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get table counts',
      error: error.message
    });
  }
};

module.exports = exports;
