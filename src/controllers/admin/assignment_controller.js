const path = require('path');
const fs = require('fs');
const sharedAssignmentService = require('../../services/assignment_service');
const adminAssignmentService = require('../../services/admin/assignment_service');
const { promisePool } = require('../../config/db');
const { ROLE_SUPER_ADMIN } = require('../../utils/org_scoping');

const sendError = (res, error) => {
  const status = error.statusCode || 500;
  const body = { success: false, message: error.message || 'Internal error' };
  if (error.details) body.details = error.details;
  if (status >= 500) console.error('Admin assignment error:', error);
  res.status(status).json(body);
};

exports.createAssignment = async (req, res) => {
  try {
    const assignment = await sharedAssignmentService.createAssignment(req.user, req.body || {});
    // Fire-and-forget: notify recipients (don't block the response)
    adminAssignmentService.dispatchCreatedNotifications(assignment).catch((err) => {
      console.error('dispatchCreatedNotifications error (background):', err && err.message);
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    sendError(res, error);
  }
};

exports.listAssignments = async (req, res) => {
  try {
    const { rows, total } = await adminAssignmentService.listAssignments(req.query);
    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Math.min(parseInt(req.query.limit, 10) || 25, 200),
        offset: parseInt(req.query.offset, 10) || 0
      }
    });
  } catch (error) {
    sendError(res, error);
  }
};

exports.getAssignment = async (req, res) => {
  try {
    const assignment = req.assignment
      ? await adminAssignmentService.getAssignmentDetail(req.assignment.id)
      : null;
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, data: assignment });
  } catch (error) {
    sendError(res, error);
  }
};

exports.patchAssignment = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const updated = await sharedAssignmentService.patchAssignment(req.assignment.id, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const affected = await sharedAssignmentService.softDeleteAssignment(req.assignment.id);
    if (affected === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    sendError(res, error);
  }
};

exports.listSubmissions = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const { rows, total } = await adminAssignmentService.listSubmissions(req.assignment.id, req.query);
    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Math.min(parseInt(req.query.limit, 10) || 50, 500),
        offset: parseInt(req.query.offset, 10) || 0
      }
    });
  } catch (error) {
    sendError(res, error);
  }
};

exports.reviewSubmission = async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    if (Number.isNaN(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission id' });
    }
    const updated = await adminAssignmentService.reviewSubmission(submissionId, req.user.uuid, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
};

// Map file extensions to MIME types so the browser can decide whether to
// preview inline (pdf, image) or download (everything else).
const EXT_TO_MIME = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};
const INLINE_PREVIEWABLE = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt']);

exports.downloadSubmissionFile = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const userId = req.params.userId;
    const { rows } = await adminAssignmentService.listSubmissions(req.assignment.id, { user_id: userId, limit: 1 });
    const submission = rows[0];
    if (!submission || !submission.file_url) {
      return res.status(404).json({ success: false, message: 'No file submission found' });
    }
    const absPath = path.resolve(submission.file_url);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: 'File missing on disk' });
    }

    const fileName = submission.file_name || path.basename(absPath);
    const ext = path.extname(fileName).toLowerCase();
    const mime = EXT_TO_MIME[ext] || 'application/octet-stream';
    // ?download=1 forces a download; otherwise we let the browser preview if possible.
    const forceDownload = req.query.download === '1';
    const disposition = !forceDownload && INLINE_PREVIEWABLE.has(ext) ? 'inline' : 'attachment';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-cache');
    fs.createReadStream(absPath).pipe(res);
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /api/admin/assignments/:id/submissions/:userId/detail
 *
 * Full per-question breakdown of a single learner's submission. Used by the
 * admin SubmissionDetail page. Requires assignment-visibility (already
 * applied at the route via requireAssignmentVisibility middleware).
 */
exports.getSubmissionDetail = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const userId = req.params.userId;
    const detail = await adminAssignmentService.getSubmissionDetail(req.assignment.id, userId);
    if (!detail.submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * POST /api/admin/assignments/submissions/:submissionId/email-result
 *
 * Email the learner the per-question result of an assessment submission.
 */
exports.emailSubmissionResult = async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    if (!submissionId) {
      return res.status(400).json({ success: false, message: 'Invalid submissionId' });
    }
    const result = await adminAssignmentService.emailSubmissionResult(submissionId);
    res.json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /api/admin/assignments/assessment-options
 *
 * Return the assessment library available to the calling admin for use as
 * the `assessment_id` of an `assignment.type='assessment'`. Org-scoping rule:
 * an org-admin sees assessments whose creator is in any of their organizations.
 * Super-admin sees all active assessments. Only `feedback_forms` rows of
 * type='assessment' and status='active' are returned.
 */
exports.listAssessmentOptions = async (req, res) => {
  try {
    const callerUuid = req.user.uuid;
    const roleId = req.user.role_id;
    let rows;
    if (roleId === ROLE_SUPER_ADMIN) {
      [rows] = await promisePool.query(
        `SELECT
            f.id, f.uuid, f.name, f.description,
            f.assessment_type AS assessmentType,
            f.status, f.created_at AS createdAt,
            f.created_by AS createdBy
           FROM feedback_forms f
           WHERE f.type = 'assessment'
             AND f.status = 'active'
           ORDER BY f.created_at DESC
           LIMIT 200`
      );
    } else {
      // Caller's orgs ∩ assessment creator's orgs (via user_organizations).
      // Also include assessments the caller created themselves so newly
      // created ones are visible immediately even if the creator-side
      // user_organizations row is missing.
      [rows] = await promisePool.query(
        `SELECT
            f.id, f.uuid, f.name, f.description,
            f.assessment_type AS assessmentType,
            f.status, f.created_at AS createdAt,
            f.created_by AS createdBy
           FROM feedback_forms f
           WHERE f.type = 'assessment'
             AND f.status = 'active'
             AND (
               f.created_by = ?
               OR f.created_by IN (
                 SELECT uo.user_id FROM user_organizations uo
                  WHERE uo.organization_id IN (
                    SELECT organization_id FROM user_organizations WHERE user_id = ?
                  )
               )
             )
           ORDER BY f.created_at DESC
           LIMIT 200`,
        [callerUuid, callerUuid]
      );
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    sendError(res, error);
  }
};
