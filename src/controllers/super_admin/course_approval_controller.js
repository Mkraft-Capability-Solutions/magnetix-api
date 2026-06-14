const service = require('../../services/super_admin/course_approval_service');

/**
 * Course Approval Controller.
 * Super-admin endpoints (config + send) are mounted under content-governance;
 * the approver endpoints (mine + decide) are mounted at /api/course-approvals.
 */

const send = (res, result, okStatus = 200) => {
  if (result.success) return res.status(okStatus).json({ success: true, data: result.data, message: result.message });
  return res.status(result.status || 400).json({ success: false, message: result.message });
};

const fail = (res, err, msg) => {
  console.error(`Course Approval Controller - ${msg}:`, err);
  res.status(500).json({ success: false, message: msg, error: err.message });
};

// PUT /super-admin/content-governance/courses/:id/approval-config  (super admin)
exports.upsertConfig = async (req, res) => {
  try {
    const { requiresApproval, approverUuid, approverEmail } = req.body || {};
    const result = await service.upsertConfig(
      req.params.id,
      { requiresApproval, approverUuid, approverEmail },
      req.user?.uuid
    );
    send(res, result);
  } catch (err) { fail(res, err, 'Failed to save approval configuration'); }
};

// GET /super-admin/content-governance/courses/:id/approval-config  (super admin)
exports.getConfig = async (req, res) => {
  try { send(res, await service.getConfigForCourse(req.params.id)); }
  catch (err) { fail(res, err, 'Failed to load approval configuration'); }
};

// POST /super-admin/content-governance/courses/:id/request-approval  (super admin)
exports.requestApproval = async (req, res) => {
  try { send(res, await service.requestApproval(req.params.id, req.user?.uuid)); }
  catch (err) { fail(res, err, 'Failed to send approval request'); }
};

// GET /api/course-approvals/mine  (any non-learner)
exports.listMine = async (req, res) => {
  try {
    const data = await service.listMyApprovals(req.user?.uuid);
    res.json({ success: true, data });
  } catch (err) { fail(res, err, 'Failed to load approvals'); }
};

// POST /api/course-approvals/:id/decide  (the designated approver)
exports.decide = async (req, res) => {
  try {
    const { decision, note } = req.body || {};
    send(res, await service.decide(req.params.id, decision, note, req.user?.uuid));
  } catch (err) { fail(res, err, 'Failed to record decision'); }
};
