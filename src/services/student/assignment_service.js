const path = require('path');
const fs = require('fs');
const { promisePool } = require('../../config/db');
const sharedAssignmentService = require('../assignment_service');
const { submitAssessmentStandalone } = require('../assessment_service');
const { uploadFile } = require('../../utils/file_upload');
const emailHelper = require('../../utils/email_helper');
const notificationService = require('../notification_service');
const { sendAssignmentEmailSafely } = require('../../utils/assignment_email_helper');

/**
 * List assignments visible to the learner. Visibility:
 * - scope='organization' AND user is in that organization
 * - scope='team' AND user is in that team
 */
async function listForLearner(userId, filters = {}) {
  const where = ['a.is_deleted = 0', `(
    (a.scope = 'organization' AND a.organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = ?
    ))
    OR
    (a.scope = 'team' AND a.team_id IN (
      SELECT team_id FROM team_members WHERE user_id = ?
    ))
  )`];
  const params = [userId, userId];

  if (filters.status === 'upcoming') where.push('a.start_date > NOW()');
  else if (filters.status === 'active') where.push('a.start_date <= NOW() AND a.end_date >= NOW()');
  else if (filters.status === 'expired') where.push('a.end_date < NOW()');

  if (filters.type) {
    where.push('a.type = ?');
    params.push(filters.type);
  }
  if (filters.q) {
    where.push('(a.title LIKE ? OR a.description LIKE ?)');
    const q = `%${filters.q}%`;
    params.push(q, q);
  }
  if (filters.submitted === 'yes') {
    where.push('s.id IS NOT NULL');
  } else if (filters.submitted === 'no') {
    where.push('s.id IS NULL');
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const limit = Math.min(parseInt(filters.limit, 10) || 25, 200);
  const offset = parseInt(filters.offset, 10) || 0;

  const [rows] = await promisePool.query(
    `SELECT a.id, a.uuid, a.title, a.description, a.type, a.scope,
            a.start_date, a.end_date, a.allow_resubmission, a.assessment_id,
            a.allowed_file_types, a.max_file_size_mb,
            s.id AS submission_id, s.uuid AS submission_uuid, s.status AS submission_status,
            s.submitted_at, s.file_url, s.file_name, s.assessment_response_id,
            s.feedback, s.reviewed_at,
            CASE
              WHEN s.id IS NOT NULL THEN 'submitted'
              WHEN a.start_date > NOW() THEN 'upcoming'
              WHEN a.end_date < NOW() THEN 'missed'
              ELSE 'pending'
            END AS learner_state
       FROM assignments a
       LEFT JOIN assignment_submissions s
         ON s.assignment_id = a.id AND s.user_id = ?
       ${whereSql}
       ORDER BY a.end_date ASC
       LIMIT ? OFFSET ?`,
    [userId, ...params, limit, offset]
  );
  const [countRows] = await promisePool.query(
    `SELECT COUNT(*) AS total FROM assignments a
       LEFT JOIN assignment_submissions s
         ON s.assignment_id = a.id AND s.user_id = ?
       ${whereSql}`,
    [userId, ...params]
  );
  return { rows, total: countRows[0].total };
}

async function getForLearner(userId, assignmentId) {
  const a = await sharedAssignmentService.getAssignmentById(assignmentId);
  if (!a) return null;
  const [subs] = await promisePool.query(
    'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? LIMIT 1',
    [assignmentId, userId]
  );
  let questions = null;
  if (a.type === 'assessment' && a.assessment_id) {
    const [forms] = await promisePool.query(
      `SELECT id, name, description, type, assessment_type, show_correct_answers
         FROM feedback_forms WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [a.assessment_id]
    );
    if (forms[0]) {
      const [qs] = await promisePool.query(
        `SELECT id, question_order, question_type, question_text, is_required, options, score
           FROM feedback_questions WHERE form_id = ? ORDER BY question_order ASC`,
        [a.assessment_id]
      );
      questions = qs.map(q => ({
        ...q,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
        is_required: q.is_required === 1
      }));
    }
  }
  return {
    ...a,
    submission: subs[0] || null,
    assessment: questions ? { id: a.assessment_id, questions } : null
  };
}

async function _notifyOnSubmission(assignment, submission, learner) {
  const learnerName = [learner.first_name, learner.last_name].filter(Boolean).join(' ') || learner.email;

  // Confirmation to learner
  try {
    await notificationService.createSystemNotification(
      learner.uuid,
      `Submission received: ${assignment.title}`,
      'We received your submission.',
      'assignment',
      `${process.env.FRONTEND_URL || ''}/learner/assignments/${assignment.uuid}`,
      { submissionId: submission.id }
    );
  } catch (err) { console.error('learner submission in-app notify failed:', err && err.message); }

  await sendAssignmentEmailSafely({
    email_type: 'submission_confirm',
    assignmentId: assignment.id,
    userId: learner.uuid,
    fn: () => emailHelper.sendSubmissionConfirmationEmail(
      learner.email,
      learner.first_name || 'there',
      assignment,
      submission
    )
  });

  // Notify creator (and team manager if different + it's a team assignment)
  try {
    const creator = await sharedAssignmentService.getCreatorProfile(assignment);
    const creatorName = creator
      ? [creator.first_name, creator.last_name].filter(Boolean).join(' ') || creator.email
      : 'there';
    if (creator && creator.email) {
      try {
        await notificationService.createSystemNotification(
          creator.uuid,
          `New submission: ${assignment.title}`,
          `${learnerName} submitted "${assignment.title}".`,
          'assignment',
          `${process.env.FRONTEND_URL || ''}/admin/assignments/${assignment.uuid}/submissions`,
          { submissionId: submission.id, learnerId: learner.uuid }
        );
      } catch (err) { console.error('creator submission in-app notify failed:', err && err.message); }
      await sendAssignmentEmailSafely({
        email_type: 'submission_received',
        assignmentId: assignment.id,
        userId: creator.uuid,
        fn: () => emailHelper.sendSubmissionReceivedEmail(
          creator.email,
          creatorName,
          learnerName,
          learner.email,
          assignment,
          { ...submission, recipientRole: creator.role_id === 4 || creator.role_id === 3 ? 'admin' : 'manager' }
        )
      });
    }

    // Team manager (if different from creator)
    if (assignment.scope === 'team' && assignment.team_id) {
      const [teamRows] = await promisePool.query(
        `SELECT t.manager_id, u.email,
                COALESCE(s.first_name, ad.first_name, ins.first_name, sa.first_name) AS first_name,
                COALESCE(s.last_name,  ad.last_name,  ins.last_name,  sa.last_name)  AS last_name
           FROM teams t
           LEFT JOIN users u            ON u.uuid = t.manager_id
           LEFT JOIN students s         ON s.user_id = u.uuid
           LEFT JOIN admins ad          ON ad.user_id = u.uuid
           LEFT JOIN instructors ins    ON ins.user_id = u.uuid
           LEFT JOIN super_admins sa    ON sa.user_id = u.uuid
           WHERE t.id = ?`,
        [assignment.team_id]
      );
      const mgr = teamRows[0];
      if (mgr && mgr.manager_id && mgr.manager_id !== assignment.created_by && mgr.email) {
        const mgrName = [mgr.first_name, mgr.last_name].filter(Boolean).join(' ') || mgr.email;
        try {
          await notificationService.createSystemNotification(
            mgr.manager_id,
            `New submission: ${assignment.title}`,
            `${learnerName} submitted "${assignment.title}".`,
            'assignment',
            `${process.env.FRONTEND_URL || ''}/manager/assignments/${assignment.uuid}/submissions`,
            { submissionId: submission.id, learnerId: learner.uuid }
          );
        } catch (err) { console.error('manager submission in-app notify failed:', err && err.message); }
        await sendAssignmentEmailSafely({
          email_type: 'submission_received',
          assignmentId: assignment.id,
          userId: mgr.manager_id,
          fn: () => emailHelper.sendSubmissionReceivedEmail(
            mgr.email,
            mgrName,
            learnerName,
            learner.email,
            assignment,
            { ...submission, recipientRole: 'manager' }
          )
        });
      }
    }
  } catch (err) {
    console.error('creator/manager submission notify error:', err && err.message);
  }
}

async function _resolveLearner(userId) {
  const [rows] = await promisePool.query(
    `SELECT u.uuid, u.email,
            COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name) AS first_name,
            COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)  AS last_name
       FROM users u
       LEFT JOIN students s      ON u.uuid = s.user_id
       LEFT JOIN admins a        ON u.uuid = a.user_id
       LEFT JOIN instructors i   ON u.uuid = i.user_id
       LEFT JOIN super_admins sa ON u.uuid = sa.user_id
       WHERE u.uuid = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function submitDocument(userId, assignment, file, notes) {
  if (assignment.type !== 'document') {
    const err = new Error('This assignment is not a document submission'); err.statusCode = 400; throw err;
  }
  if (!file) {
    const err = new Error('File is required'); err.statusCode = 400; throw err;
  }
  await sharedAssignmentService.assertSubmittable(assignment, userId);

  const allowed = (assignment.allowed_file_types || sharedAssignmentService.DEFAULT_FILE_TYPES)
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  if (!allowed.includes(ext)) {
    const err = new Error(`File type .${ext} not allowed. Allowed: ${allowed.join(', ')}`);
    err.statusCode = 400; throw err;
  }
  const maxBytes = (assignment.max_file_size_mb || sharedAssignmentService.DEFAULT_MAX_MB) * 1024 * 1024;
  if (file.size > maxBytes) {
    const err = new Error(`File too large (${file.size} bytes); max ${maxBytes}`);
    err.statusCode = 400; throw err;
  }

  const uploadPath = path.join('uploads', 'assignments', String(assignment.id), userId);
  const allowedExtsWithDot = allowed.map(e => `.${e}`);
  const filename = uploadFile(file, uploadPath, allowedExtsWithDot);
  const fullPath = path.join(uploadPath, filename);

  const { row: submission, created } = await sharedAssignmentService.upsertSubmission(assignment, userId, {
    submission_type: 'document',
    file_url: fullPath.replace(/\\/g, '/'),
    file_name: file.originalname,
    file_size_bytes: file.size,
    notes
  });

  // Best-effort: clean up previous file when overwriting
  if (!created) {
    // We overwrote in DB; old file still on disk. Best-effort cleanup of old files
    // in the same dir except the latest one (cheap and safe).
    try {
      const dir = uploadPath;
      const latest = path.basename(fullPath);
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (f !== latest) {
          try { fs.unlinkSync(path.join(dir, f)); } catch (_) { /* ignore */ }
        }
      }
    } catch (_) { /* ignore */ }
  }

  const learner = await _resolveLearner(userId);
  if (learner) _notifyOnSubmission(assignment, submission, learner).catch(() => {});

  return submission;
}

async function submitAssessment(userId, assignment, answers, notes) {
  if (assignment.type !== 'assessment') {
    const err = new Error('This assignment is not an assessment submission'); err.statusCode = 400; throw err;
  }
  if (!Array.isArray(answers)) {
    const err = new Error('answers must be an array'); err.statusCode = 400; throw err;
  }
  await sharedAssignmentService.assertSubmittable(assignment, userId);

  const result = await submitAssessmentStandalone(userId, assignment.assessment_id, answers);

  const { row: submission } = await sharedAssignmentService.upsertSubmission(assignment, userId, {
    submission_type: 'assessment',
    assessment_response_id: result.responseId,
    notes
  });

  const learner = await _resolveLearner(userId);
  if (learner) {
    // Internal email always includes the score (even when showReport=false the
    // admin/system still wants the audit trail). Only the learner-facing
    // response below is gated.
    _notifyOnSubmission(assignment, { ...submission, assessment_score: `${result.score}/${result.maxScore} (${result.percentage}%)` }, learner).catch(() => {});
  }

  // Respect feedback_forms.show_report. When false, the learner gets only
  // an "accepted" acknowledgement — no score, percentage, or per-question
  // AI feedback. Admin/email flows still see everything because they call
  // submitAssessmentStandalone or its result-detail endpoint directly.
  if (!result.showReport) {
    return {
      submission,
      accepted: true,
      showReport: false
    };
  }

  return {
    submission,
    score: result.score,
    maxScore: result.maxScore,
    percentage: result.percentage,
    aiScoringResults: result.aiScoringResults,
    showReport: true
  };
}

module.exports = {
  listForLearner,
  getForLearner,
  submitDocument,
  submitAssessment
};
