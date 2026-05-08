const sharedAssignmentService = require('../../services/assignment_service');
const adminAssignmentService = require('../../services/admin/assignment_service');
const managerAssignmentService = require('../../services/manager/assignment_service');

const sendError = (res, error) => {
  const status = error.statusCode || 500;
  const body = { success: false, message: error.message || 'Internal error' };
  if (error.details) body.details = error.details;
  if (status >= 500) console.error('Manager assignment error:', error);
  res.status(status).json(body);
};

exports.listAssignments = async (req, res) => {
  try {
    const { rows, total } = await managerAssignmentService.listManagedAssignments(req.user.uuid, req.query);
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

exports.createAssignment = async (req, res) => {
  try {
    const body = req.body || {};
    // Force scope to 'team' for managers
    body.scope = 'team';
    if (!body.team_id) {
      return res.status(400).json({ success: false, message: 'team_id is required' });
    }
    const teamIds = await managerAssignmentService.getManagedTeamIds(req.user.uuid);
    if (!teamIds.includes(parseInt(body.team_id, 10))) {
      return res.status(403).json({ success: false, message: 'You do not manage this team' });
    }
    const assignment = await sharedAssignmentService.createAssignment(req.user, body);
    adminAssignmentService.dispatchCreatedNotifications(assignment).catch((err) => {
      console.error('dispatchCreatedNotifications (manager) error:', err && err.message);
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    sendError(res, error);
  }
};

exports.getAssignment = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const assignment = await adminAssignmentService.getAssignmentDetail(req.assignment.id);
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
    if (req.assignment.scope !== 'team' || !req.assignment.team_id) {
      return res.status(403).json({ success: false, message: 'Managers can only edit team assignments' });
    }
    const teamIds = await managerAssignmentService.getManagedTeamIds(req.user.uuid);
    if (!teamIds.includes(req.assignment.team_id)) {
      return res.status(403).json({ success: false, message: 'You do not manage this assignment\'s team' });
    }
    const updated = await sharedAssignmentService.patchAssignment(req.assignment.id, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
};

exports.listSubmissions = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const { rows, total } = await managerAssignmentService.listManagedSubmissions(
      req.user.uuid,
      req.assignment.id,
      req.query
    );
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

/**
 * GET /api/manager/assignments/:id/submissions/:userId/detail
 *
 * Full per-question breakdown of a single learner's submission. Mirrors the
 * admin getSubmissionDetail. Authorization layers:
 *   1. requireAssignmentVisibility (route middleware) — already widened to
 *      allow non-team managers via the reports_to chain.
 *   2. Per-user check below — the target userId must be in the caller's
 *      visible learner set (team members ∪ reportees).
 */
exports.getSubmissionDetail = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    // Super admins skip the per-user gate (they already pass through
    // requireAssignmentVisibility unconditionally).
    if (req.user.role_id !== 4) {
      const visible = await managerAssignmentService.getVisibleLearnerUuids(req.user.uuid);
      if (!visible.includes(userId)) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
    }

    const detail = await adminAssignmentService.getSubmissionDetail(req.assignment.id, userId);
    if (!detail.submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    res.json({ success: true, data: detail });
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
    // Verify the submission belongs to a team this manager owns.
    const submission = await adminAssignmentService.getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    // Allow review if the submission's learner is either a member of one of
    // the manager's teams OR a direct/transitive reportee via reports_to.
    const visibleLearnerIds = await managerAssignmentService.getVisibleLearnerUuids(req.user.uuid);
    if (!visibleLearnerIds.includes(submission.user_id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this submission' });
    }
    const updated = await adminAssignmentService.reviewSubmission(submissionId, req.user.uuid, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
};
