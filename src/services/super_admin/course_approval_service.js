const { promisePool: pool } = require('../../config/db');
const emailHelper = require('../../utils/email_helper');
const governance = require('./content_governance_service');

/**
 * Course Approval Service.
 *
 * Per-course approval configuration + the request/decision flow that gates
 * publishing. Builds on the existing course lifecycle (transitionLifecycle) and
 * the notifications table. See migration 20260615120000-course-approvals.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || '';

// Name lookup mirrors content_governance_service (names live across 3 profile tables).
const NAME_SUBQUERY = `(
  SELECT user_id, first_name, last_name FROM students
  UNION ALL SELECT user_id, first_name, last_name FROM instructors
  UNION ALL SELECT user_id, first_name, last_name FROM admins
)`;

async function resolveUser(uuid) {
  const [rows] = await pool.query(
    `SELECT u.uuid, u.email, u.role_id AS roleId,
            TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))) AS name
       FROM users u
       LEFT JOIN ${NAME_SUBQUERY} p ON p.user_id = u.uuid
      WHERE u.uuid = ?`,
    [uuid]
  );
  return rows[0] || null;
}

async function getCourseTitle(courseId) {
  const [rows] = await pool.query('SELECT title, status FROM course WHERE id = ?', [courseId]);
  return rows[0] || null;
}

// Insert an in-app notification directly so we can set action_url (the shared
// notification_service.createNotification omits that column).
async function pushNotification(recipientUuid, title, message, actionUrl, metadata) {
  await pool.query(
    `INSERT INTO notifications
       (uuid, title, message, notification_type, icon, action_url, metadata, recipient_id, delivery_method)
     VALUES (UUID(), ?, ?, 'course', 'book', ?, ?, ?, 'in-app')`,
    [title, message, actionUrl || null, metadata ? JSON.stringify(metadata) : null, recipientUuid]
  );
}

/* --------------------------------------------------------------- Config */

/**
 * Save/replace a course's approval configuration (one current row per course).
 * approverType is derived: a uuid => 'user', else an email => 'email'.
 */
const upsertConfig = async (courseId, cfg, requestedBy) => {
  const requiresApproval = cfg.requiresApproval ? 1 : 0;

  // Disabling approval: clear any existing config.
  if (!requiresApproval) {
    await pool.query('DELETE FROM course_approval_requests WHERE course_id = ?', [courseId]);
    return { success: true, data: { requiresApproval: false } };
  }

  let approverType;
  let approverUuid = null;
  let approverEmail = null;

  if (cfg.approverUuid) {
    const user = await resolveUser(cfg.approverUuid);
    if (!user) return { success: false, status: 400, message: 'Approver user not found' };
    if (Number(user.roleId) === 1) {
      return { success: false, status: 400, message: 'Learners cannot be approvers' };
    }
    approverType = 'user';
    approverUuid = user.uuid;
    approverEmail = user.email;
  } else if (cfg.approverEmail) {
    approverType = 'email';
    approverEmail = String(cfg.approverEmail).trim();
  } else {
    return { success: false, status: 400, message: 'An approver (user or email) is required' };
  }

  await pool.query('DELETE FROM course_approval_requests WHERE course_id = ?', [courseId]);
  await pool.query(
    `INSERT INTO course_approval_requests
       (course_id, requires_approval, approver_type, approver_uuid, approver_email, status, requested_by)
     VALUES (?, 1, ?, ?, ?, 'pending', ?)`,
    [courseId, approverType, approverUuid, approverEmail, requestedBy || null]
  );

  return { success: true, data: { requiresApproval: true, approverType, approverUuid, approverEmail } };
};

const getConfigForCourse = async (courseId) => {
  const [rows] = await pool.query(
    `SELECT car.id, car.course_id AS courseId, car.requires_approval AS requiresApproval,
            car.approver_type AS approverType, car.approver_uuid AS approverUuid,
            car.approver_email AS approverEmail, car.status, car.requested_at AS requestedAt,
            TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))) AS approverName
       FROM course_approval_requests car
       LEFT JOIN ${NAME_SUBQUERY} p ON p.user_id = car.approver_uuid
      WHERE car.course_id = ?
      ORDER BY car.id DESC LIMIT 1`,
    [courseId]
  );
  const row = rows[0];
  if (!row) return { success: true, data: { requiresApproval: false } };
  return { success: true, data: { ...row, requiresApproval: !!row.requiresApproval } };
};

/* -------------------------------------------------------------- Request */

/**
 * Send the approval request / notice for a course.
 *  - user  : ensure course is 'pending' (submit if draft), notify approver in-app + email.
 *  - email : send the "course added with your approval" notice (non-blocking).
 */
const requestApproval = async (courseId, actorUuid) => {
  const [rows] = await pool.query(
    'SELECT * FROM course_approval_requests WHERE course_id = ? ORDER BY id DESC LIMIT 1',
    [courseId]
  );
  const req = rows[0];
  if (!req || !req.requires_approval) {
    return { success: false, status: 400, message: 'This course is not configured to require approval' };
  }

  const course = await getCourseTitle(courseId);
  if (!course) return { success: false, status: 404, message: 'Course not found' };
  const link = FRONTEND_URL ? `${FRONTEND_URL}/approvals` : '/approvals';

  if (req.approver_type === 'user') {
    // Push the course into review if it's still a draft.
    if (course.status === 'draft') {
      const t = await governance.transitionLifecycle(courseId, 'submit', 'Sent for designated approval', actorUuid);
      if (!t.success) return t;
    }
    await pool.query(
      `UPDATE course_approval_requests SET status = 'pending', requested_at = NOW(), requested_by = ? WHERE id = ?`,
      [actorUuid, req.id]
    );
    await pushNotification(
      req.approver_uuid,
      'Course approval requested',
      `You have been asked to approve the course "${course.title}".`,
      link,
      { courseId, courseTitle: course.title }
    );
    sendEmailSafe({
      to: req.approver_email,
      subject: `Approval requested: ${course.title}`,
      html: `<p>Hello,</p><p>You have been requested to approve the course <strong>${escapeHtml(course.title)}</strong>.</p>
             <p>Please open your <a href="${link}">Approvals</a> page to approve or reject it.</p>`,
    });
    return { success: true, message: 'Approval request sent', data: { status: 'pending' } };
  }

  // approver_type === 'email' → notify only, non-blocking.
  await pool.query(
    `UPDATE course_approval_requests SET status = 'notified', requested_at = NOW(), requested_by = ? WHERE id = ?`,
    [actorUuid, req.id]
  );
  sendEmailSafe({
    to: req.approver_email,
    subject: `A course has been added with your approval: ${course.title}`,
    html: `<p>Hello,</p><p>The course <strong>${escapeHtml(course.title)}</strong> has been added with your approval.</p>`,
  });
  return { success: true, message: 'Approval notice sent', data: { status: 'notified' } };
};

/* -------------------------------------------------------------- Decide */

const listMyApprovals = async (approverUuid) => {
  const [rows] = await pool.query(
    `SELECT car.id, car.course_id AS courseId, car.status, car.requested_at AS requestedAt,
            c.title AS courseTitle, c.status AS courseStatus,
            TRIM(CONCAT(COALESCE(rp.first_name,''),' ',COALESCE(rp.last_name,''))) AS requestedByName
       FROM course_approval_requests car
       JOIN course c ON c.id = car.course_id
       LEFT JOIN ${NAME_SUBQUERY} rp ON rp.user_id = car.requested_by
      WHERE car.approver_uuid = ? AND car.approver_type = 'user' AND car.status = 'pending'
      ORDER BY car.requested_at DESC, car.id DESC`,
    [approverUuid]
  );
  return rows;
};

/**
 * The designated approver approves/rejects. Authorized by being the approver on
 * the request (not by the permission system), so any non-learner can act.
 */
const decide = async (requestId, decision, note, actorUuid) => {
  if (decision !== 'approve' && decision !== 'reject') {
    return { success: false, status: 400, message: 'decision must be approve or reject' };
  }
  const [rows] = await pool.query('SELECT * FROM course_approval_requests WHERE id = ?', [requestId]);
  const req = rows[0];
  if (!req) return { success: false, status: 404, message: 'Approval request not found' };
  if (req.approver_type !== 'user' || req.approver_uuid !== actorUuid) {
    return { success: false, status: 403, message: 'You are not the designated approver for this course' };
  }
  if (req.status !== 'pending') {
    return { success: false, status: 409, message: `This request was already ${req.status}` };
  }

  // Apply the lifecycle move (approve → published, reject → draft).
  const action = decision === 'approve' ? 'approve' : 'reject';
  const t = await governance.transitionLifecycle(req.course_id, action, note, actorUuid);
  if (!t.success) return t;

  await pool.query(
    `UPDATE course_approval_requests SET status = ?, decided_at = NOW(), note = ? WHERE id = ?`,
    [decision === 'approve' ? 'approved' : 'rejected', note || null, requestId]
  );

  // Notify the requester (super admin) of the outcome.
  const course = await getCourseTitle(req.course_id);
  const approver = await resolveUser(actorUuid);
  if (req.requested_by) {
    await pushNotification(
      req.requested_by,
      `Course ${decision === 'approve' ? 'approved' : 'rejected'}`,
      `${approver?.name || 'The approver'} ${decision === 'approve' ? 'approved' : 'rejected'} "${course?.title || 'a course'}".`,
      FRONTEND_URL ? `${FRONTEND_URL}/superadmin/content/catalog` : '/superadmin/content/catalog',
      { courseId: req.course_id, decision }
    );
    const requester = await resolveUser(req.requested_by);
    if (requester?.email) {
      sendEmailSafe({
        to: requester.email,
        subject: `Course ${decision === 'approve' ? 'approved' : 'rejected'}: ${course?.title || ''}`,
        html: `<p>${escapeHtml(approver?.name || 'The approver')} <strong>${decision === 'approve' ? 'approved' : 'rejected'}</strong> the course <strong>${escapeHtml(course?.title || '')}</strong>.</p>${note ? `<p>Note: ${escapeHtml(note)}</p>` : ''}`,
      });
    }
  }

  return { success: true, message: `Course ${decision}d`, data: { status: t.data?.status } };
};

/* --------------------------------------------------------------- utils */

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Fire-and-forget email; never let an email failure break the workflow.
function sendEmailSafe(opts) {
  if (!opts.to) return;
  Promise.resolve()
    .then(() => emailHelper.sendEmail({ ...opts, text: opts.text || stripHtml(opts.html) }))
    .catch((err) => console.error('Course approval email failed:', err.message));
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = {
  upsertConfig,
  getConfigForCourse,
  requestApproval,
  listMyApprovals,
  decide,
};
