const { promisePool } = require('../../config/db');
const notificationService = require('../notification_service');

/**
 * Minimal profile for the drill-down page header.
 * Uses the same LEFT JOIN fan-out as dashboard_service so names resolve
 * regardless of which role-specific table holds them.
 */
const getMemberProfile = async (userId) => {
  const [rows] = await promisePool.query(
    `SELECT
        u.uuid AS id,
        u.email,
        u.role_id,
        u.status,
        COALESCE(s.first_name, a.first_name, i.first_name, '') AS first_name,
        COALESCE(s.last_name,  a.last_name,  i.last_name,  '') AS last_name
       FROM users u
       LEFT JOIN students    s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN admins      a ON u.uuid = a.user_id AND u.role_id IN (2, 3)
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 3
      WHERE u.uuid = ? AND u.is_deleted = 0
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

/**
 * Overview card — wraps get_student_dashboard_stats.
 */
const getOverview = async (userId) => {
  const profile = await getMemberProfile(userId);
  if (!profile) {
    return { success: false, error: { message: 'User not found' } };
  }

  const [resultSets] = await promisePool.query('CALL get_student_dashboard_stats(?)', [userId]);
  const stats = (resultSets && resultSets[0] && resultSets[0][0]) || {};

  return {
    success: true,
    data: { profile, stats }
  };
};

const getEnrolledCourses = async (userId) => {
  const [resultSets] = await promisePool.query(
    'CALL get_member_enrolled_courses(?)',
    [userId]
  );
  return { success: true, data: resultSets[0] || [] };
};

const getAssessments = async (userId) => {
  const profile = await getMemberProfile(userId);
  if (!profile) {
    return { success: false, error: { message: 'User not found' } };
  }
  const [resultSets] = await promisePool.query(
    'CALL get_member_assessment_history(?, ?)',
    [userId, profile.email]
  );
  return { success: true, data: resultSets[0] || [] };
};

const getCertificates = async (userId) => {
  const [resultSets] = await promisePool.query(
    'CALL get_member_certificates(?)',
    [userId]
  );
  return { success: true, data: resultSets[0] || [] };
};

const getLearningHours = async (userId, days = 30) => {
  const safeDays = Math.max(1, Math.min(365, parseInt(days, 10) || 30));
  const [resultSets] = await promisePool.query(
    'CALL get_member_learning_hours(?, ?)',
    [userId, safeDays]
  );
  const daily = resultSets[0] || [];
  const totalHours = daily.reduce((sum, d) => sum + Number(d.hours || 0), 0);
  return {
    success: true,
    data: { daily, totalHours, days: safeDays }
  };
};

const getEnrollableCourses = async (userId, search = '') => {
  const like = `%${search}%`;
  const [rows] = await promisePool.query(
    `SELECT c.id, c.title, c.description
       FROM course c
      WHERE c.is_deleted = 0
        AND (? = '' OR c.title LIKE ?)
        AND c.id NOT IN (
          SELECT e.course_id FROM enrol e WHERE e.user_id = ?
        )
      ORDER BY c.title
      LIMIT 50`,
    [search, like, userId]
  );
  return { success: true, data: rows };
};

const getAssignableAssessments = async (userId, search = '') => {
  const like = `%${search}%`;
  const [rows] = await promisePool.query(
    `SELECT ff.id, ff.name AS title, ff.description
       FROM feedback_forms ff
      WHERE ff.type = 'assessment'
        AND ff.status = 'active'
        AND ff.is_deleted = 0
        AND (? = '' OR ff.name LIKE ?)
        AND ff.id NOT IN (
          SELECT lii.source_id
            FROM learning_item_instances lii
            INNER JOIN learning_item_progress lip ON lip.instance_id = lii.id
           WHERE lii.item_type = 'quiz'
             AND lip.user_id = ?
             AND lip.status IN ('not_started', 'in_progress')
        )
      ORDER BY ff.name
      LIMIT 50`,
    [search, like, userId]
  );
  return { success: true, data: rows };
};

const enrollMemberInCourse = async (userId, courseId) => {
  // Ensure no duplicate enrolment
  const [existing] = await promisePool.query(
    'SELECT id FROM enrol WHERE user_id = ? AND course_id = ? LIMIT 1',
    [userId, courseId]
  );
  if (existing.length > 0) {
    return { success: false, error: { message: 'User is already enrolled in this course' } };
  }

  // `enrol` stores only the enrolment fact (user_id, course_id, enrolled_date).
  // It has no progress/status/completed_at columns — those are derived from
  // course_progress at read time, so we must not write them here.
  const [insert] = await promisePool.query(
    `INSERT INTO enrol (user_id, course_id, enrolled_date)
     VALUES (?, ?, CURDATE())`,
    [userId, courseId]
  );

  // Fetch course title for the notification
  const [[course]] = await promisePool.query(
    'SELECT title FROM course WHERE id = ? LIMIT 1',
    [courseId]
  );

  try {
    await notificationService.createNotification({
      title: 'New course enrollment',
      message: `You've been enrolled in "${course?.title || 'a course'}" by your admin.`,
      notification_type: 'course',
      icon: 'book',
      recipient_id: userId,
      delivery_method: 'in-app',
      metadata: JSON.stringify({ course_id: courseId })
    });
  } catch (err) {
    console.warn('enrollMemberInCourse: notification failed', err?.message);
  }

  return {
    success: true,
    data: { enrollmentId: insert.insertId, courseId, title: course?.title || null }
  };
};

const assignAssessment = async (userId, formId, dueDate, assignedBy) => {
  let instance;
  try {
    const [resultSets] = await promisePool.query(
      'CALL assign_assessment_to_user(?, ?, ?, ?)',
      [formId, userId, assignedBy, dueDate || null]
    );
    instance = (resultSets && resultSets[0] && resultSets[0][0]) || null;
  } catch (err) {
    if (err && err.sqlMessage) {
      return { success: false, error: { message: err.sqlMessage } };
    }
    throw err;
  }

  if (!instance) {
    return { success: false, error: { message: 'Failed to assign assessment' } };
  }

  try {
    const dueNote = dueDate ? ` (due ${dueDate})` : '';
    await notificationService.createNotification({
      title: 'New assessment assigned',
      message: `You've been assigned "${instance.title}"${dueNote}.`,
      notification_type: 'course', // reusing existing enum value; no schema change needed
      icon: 'book',
      recipient_id: userId,
      delivery_method: 'in-app',
      metadata: JSON.stringify({
        kind: 'assessment',
        form_id: formId,
        instance_id: instance.instance_id,
        due_date: dueDate || null
      })
    });
  } catch (err) {
    console.warn('assignAssessment: notification failed', err?.message);
  }

  return { success: true, data: instance };
};

module.exports = {
  getOverview,
  getEnrolledCourses,
  getAssessments,
  getCertificates,
  getLearningHours,
  getEnrollableCourses,
  getAssignableAssessments,
  enrollMemberInCourse,
  assignAssessment
};
