const { promisePool } = require('../../config/db');
const sharedAssignmentService = require('../assignment_service');
const emailHelper = require('../../utils/email_helper');
const notificationService = require('../notification_service');
const { sendAssignmentEmailSafely } = require('../../utils/assignment_email_helper');

const ADMIN_ROLES = new Set([3, 4]);

/**
 * Best-effort dispatch of "assignment created" notifications + emails to all
 * targeted learners. Failures are logged, never thrown.
 */
async function dispatchCreatedNotifications(assignment) {
  try {
    const recipients = await sharedAssignmentService.getRecipientsWithProfiles(assignment);
    const actionUrl = `${process.env.FRONTEND_URL || ''}/learner/assignments/${assignment.uuid}`;

    for (const r of recipients) {
      // In-app
      try {
        await notificationService.createSystemNotification(
          r.user_id,
          `New assignment: ${assignment.title}`,
          `You have a new assignment due ${new Date(assignment.end_date).toISOString()}.`,
          'assignment',
          actionUrl,
          { assignmentId: assignment.id, assignmentUuid: assignment.uuid }
        );
      } catch (err) {
        console.error(`In-app notify failed for ${r.user_id}:`, err && err.message);
      }
      // Email (idempotent via assignment_email_log)
      await sendAssignmentEmailSafely({
        email_type: 'created',
        assignmentId: assignment.id,
        userId: r.user_id,
        fn: () => emailHelper.sendAssignmentCreatedEmail(r.email, r.first_name || 'there', assignment)
      });
    }
  } catch (error) {
    console.error('dispatchCreatedNotifications error:', error && error.message);
  }
}

/**
 * Build the list query — used by both admin (no scope filter) and manager
 * (forced team_id IN managedTeamIds) callers via the `restrict` callback.
 */
async function listAssignments(filters = {}, opts = {}) {
  const where = ['a.is_deleted = 0'];
  const params = [];

  if (filters.scope) {
    where.push('a.scope = ?');
    params.push(filters.scope);
  }
  if (filters.organization_id) {
    where.push('a.organization_id = ?');
    params.push(filters.organization_id);
  }
  if (filters.team_id) {
    where.push('a.team_id = ?');
    params.push(filters.team_id);
  }
  if (filters.type) {
    where.push('a.type = ?');
    params.push(filters.type);
  }
  if (filters.q) {
    where.push('(a.title LIKE ? OR a.description LIKE ?)');
    const q = `%${filters.q}%`;
    params.push(q, q);
  }
  if (filters.status === 'upcoming') {
    where.push('a.start_date > NOW()');
  } else if (filters.status === 'active') {
    where.push('a.start_date <= NOW() AND a.end_date >= NOW()');
  } else if (filters.status === 'expired') {
    where.push('a.end_date < NOW()');
  }
  if (filters.created_by) {
    where.push('a.created_by = ?');
    params.push(filters.created_by);
  }
  if (opts.restrictTeamIds && Array.isArray(opts.restrictTeamIds)) {
    if (opts.restrictTeamIds.length === 0) {
      return { rows: [], total: 0 };
    }
    where.push(`a.team_id IN (${opts.restrictTeamIds.map(() => '?').join(',')})`);
    params.push(...opts.restrictTeamIds);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const limit = Math.min(parseInt(filters.limit, 10) || 25, 200);
  const offset = parseInt(filters.offset, 10) || 0;

  const [rows] = await promisePool.query(
    `SELECT a.id, a.uuid, a.title, a.description, a.type, a.scope,
            a.organization_id, a.team_id, a.start_date, a.end_date,
            a.allow_resubmission, a.assessment_id, a.created_by, a.created_at,
            (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submitted_count
       FROM assignments a
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await promisePool.query(
    `SELECT COUNT(*) AS total FROM assignments a ${whereSql}`,
    params
  );
  return { rows, total: countRows[0].total };
}

async function getAssignmentDetail(assignmentId) {
  const a = await sharedAssignmentService.getAssignmentById(assignmentId);
  if (!a) return null;
  const recipients = await sharedAssignmentService.getRecipientIds(a);
  return {
    ...a,
    recipientCount: recipients.length,
    submittedCount: a.submitted_count || 0
  };
}

async function listSubmissions(assignmentId, filters = {}, opts = {}) {
  const where = ['s.assignment_id = ?'];
  const params = [assignmentId];

  if (filters.status) {
    where.push('s.status = ?'); params.push(filters.status);
  }
  if (filters.user_id) {
    where.push('s.user_id = ?'); params.push(filters.user_id);
  }
  if (filters.submitted_after) {
    where.push('s.submitted_at >= ?'); params.push(new Date(filters.submitted_after));
  }
  if (filters.submitted_before) {
    where.push('s.submitted_at <= ?'); params.push(new Date(filters.submitted_before));
  }
  if (opts.restrictUserIds && Array.isArray(opts.restrictUserIds)) {
    if (opts.restrictUserIds.length === 0) return { rows: [], total: 0 };
    where.push(`s.user_id IN (${opts.restrictUserIds.map(() => '?').join(',')})`);
    params.push(...opts.restrictUserIds);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const limit = Math.min(parseInt(filters.limit, 10) || 50, 500);
  const offset = parseInt(filters.offset, 10) || 0;

  const [rows] = await promisePool.query(
    `SELECT s.id, s.uuid, s.assignment_id, s.user_id,
            s.submission_type, s.file_url, s.file_name, s.file_size_bytes,
            s.assessment_response_id, s.notes, s.status,
            s.reviewed_by, s.reviewed_at, s.feedback,
            s.submitted_at, s.updated_at,
            u.email AS user_email,
            COALESCE(st.first_name, ad.first_name, ins.first_name, sa.first_name) AS first_name,
            COALESCE(st.last_name,  ad.last_name,  ins.last_name,  sa.last_name)  AS last_name,
            fr.score, fr.max_score, fr.percentage
       FROM assignment_submissions s
       INNER JOIN users u            ON u.uuid = s.user_id
       LEFT JOIN students st         ON st.user_id = u.uuid
       LEFT JOIN admins ad           ON ad.user_id = u.uuid
       LEFT JOIN instructors ins     ON ins.user_id = u.uuid
       LEFT JOIN super_admins sa     ON sa.user_id = u.uuid
       LEFT JOIN feedback_responses fr ON fr.id = s.assessment_response_id
       ${whereSql}
       ORDER BY s.submitted_at DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await promisePool.query(
    `SELECT COUNT(*) AS total FROM assignment_submissions s ${whereSql}`,
    params
  );
  return { rows, total: countRows[0].total };
}

async function reviewSubmission(submissionId, reviewerId, { status, feedback }) {
  if (!['reviewed', 'rejected', 'submitted'].includes(status)) {
    const err = new Error('Invalid status'); err.statusCode = 400; throw err;
  }
  const [rows] = await promisePool.query(
    'SELECT s.*, a.id AS a_id, a.uuid AS a_uuid, a.title AS a_title FROM assignment_submissions s INNER JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ? LIMIT 1',
    [submissionId]
  );
  if (rows.length === 0) {
    const err = new Error('Submission not found'); err.statusCode = 404; throw err;
  }
  const submission = rows[0];

  await promisePool.query(
    `UPDATE assignment_submissions
        SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = NOW()
        WHERE id = ?`,
    [status, feedback || null, reviewerId, submissionId]
  );

  // Notify learner
  try {
    const [learnerRows] = await promisePool.query(
      `SELECT u.email, COALESCE(st.first_name, ad.first_name, ins.first_name, sa.first_name) AS first_name
         FROM users u
         LEFT JOIN students st     ON st.user_id = u.uuid
         LEFT JOIN admins ad       ON ad.user_id = u.uuid
         LEFT JOIN instructors ins ON ins.user_id = u.uuid
         LEFT JOIN super_admins sa ON sa.user_id = u.uuid
         WHERE u.uuid = ?`,
      [submission.user_id]
    );
    const [reviewerRows] = await promisePool.query(
      `SELECT COALESCE(st.first_name, ad.first_name, ins.first_name, sa.first_name) AS first_name,
              COALESCE(st.last_name,  ad.last_name,  ins.last_name,  sa.last_name)  AS last_name
         FROM users u
         LEFT JOIN students st     ON st.user_id = u.uuid
         LEFT JOIN admins ad       ON ad.user_id = u.uuid
         LEFT JOIN instructors ins ON ins.user_id = u.uuid
         LEFT JOIN super_admins sa ON sa.user_id = u.uuid
         WHERE u.uuid = ?`,
      [reviewerId]
    );
    const learner = learnerRows[0];
    const reviewerName = reviewerRows[0] ? [reviewerRows[0].first_name, reviewerRows[0].last_name].filter(Boolean).join(' ') : '';
    const assignment = { uuid: submission.a_uuid, title: submission.a_title };

    if (learner && learner.email) {
      try {
        await notificationService.createSystemNotification(
          submission.user_id,
          `Your submission has been reviewed: ${assignment.title}`,
          status === 'reviewed' ? 'Your submission has been reviewed.' : (status === 'rejected' ? 'Your submission was rejected.' : 'Your submission was acknowledged.'),
          'assignment',
          `${process.env.FRONTEND_URL || ''}/learner/assignments/${assignment.uuid}`,
          { submissionId: submission.id, status }
        );
      } catch (err) { console.error('In-app notify (review) failed:', err && err.message); }

      await sendAssignmentEmailSafely({
        email_type: 'review_completed',
        assignmentId: submission.assignment_id,
        userId: submission.user_id,
        fn: () => emailHelper.sendReviewCompletedEmail(learner.email, learner.first_name || 'there', assignment, status, feedback, reviewerName)
      });
    }
  } catch (err) {
    console.error('reviewSubmission notification error:', err && err.message);
  }

  return getSubmissionById(submissionId);
}

async function getSubmissionById(id) {
  const [rows] = await promisePool.query(
    'SELECT * FROM assignment_submissions WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  listAssignments,
  getAssignmentDetail,
  listSubmissions,
  reviewSubmission,
  getSubmissionById,
  dispatchCreatedNotifications,
  ADMIN_ROLES
};
