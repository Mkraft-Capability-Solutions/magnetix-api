const path = require('path');
const fs = require('fs');
const sharedAssignmentService = require('../../services/assignment_service');
const adminAssignmentService = require('../../services/admin/assignment_service');

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
    res.setHeader('Content-Disposition', `attachment; filename="${submission.file_name || path.basename(absPath)}"`);
    fs.createReadStream(absPath).pipe(res);
  } catch (error) {
    sendError(res, error);
  }
};
