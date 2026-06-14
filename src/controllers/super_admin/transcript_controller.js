const service = require('../../services/super_admin/transcript_service');

const fail = (res, err, msg) => {
  console.error(`Transcript Controller - ${msg}:`, err);
  res.status(500).json({ success: false, message: msg, error: err.message });
};

// GET /api/super-admin/transcripts/learners?orgId=&search=&page=&limit=
exports.getLearners = async (req, res) => {
  try {
    const { orgId, search, page, limit } = req.query;
    const data = await service.getLearners({ orgId: orgId || null, search: search || null, page, limit });
    res.json({ success: true, data });
  } catch (err) { fail(res, err, 'Failed to list learners'); }
};

// GET /api/super-admin/transcripts/:userId/full
exports.getFullTranscript = async (req, res) => {
  try {
    const result = await service.getFullTranscript(req.params.userId);
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    res.json({ success: true, data: result.data });
  } catch (err) { fail(res, err, 'Failed to load transcript'); }
};

// GET /api/super-admin/transcripts/bulk?orgId=
exports.getBulkTranscripts = async (req, res) => {
  try {
    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId is required for bulk export' });
    const result = await service.getBulkTranscripts(orgId);
    res.json({ success: true, data: result.data });
  } catch (err) { fail(res, err, 'Failed to build bulk transcripts'); }
};
