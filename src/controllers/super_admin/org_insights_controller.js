const service = require('../../services/super_admin/org_insights_service');

/**
 * Super Admin — Organization Insights Controller
 * All routes are guarded by authenticate + authorize(4) at the router level.
 */

// Pull the shared filter params off the query string.
function filtersFrom(req) {
  const { startDate, endDate, roleId, status } = req.query;
  return {
    startDate: startDate || null,
    endDate: endDate || null,
    roleId: roleId || null,
    status: status === 'active' || status === 'inactive' ? status : null,
  };
}

const fail = (res, err, msg) => {
  console.error(`Org Insights Controller - ${msg}:`, err);
  res.status(500).json({ success: false, message: msg, error: err.message });
};

exports.getOverview = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getOverview(filtersFrom(req)) });
  } catch (err) { fail(res, err, 'Failed to fetch organization overview'); }
};

exports.getSummary = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getSummary(req.params.orgId, filtersFrom(req)) });
  } catch (err) { fail(res, err, 'Failed to fetch organization summary'); }
};

exports.getEngagement = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getEngagement(req.params.orgId, filtersFrom(req)) });
  } catch (err) { fail(res, err, 'Failed to fetch engagement metrics'); }
};

exports.getLearning = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getLearning(req.params.orgId, filtersFrom(req)) });
  } catch (err) { fail(res, err, 'Failed to fetch learning metrics'); }
};

exports.getOperations = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getOperations(req.params.orgId, filtersFrom(req)) });
  } catch (err) { fail(res, err, 'Failed to fetch operations metrics'); }
};

exports.getActions = async (req, res) => {
  try {
    const { page, limit } = req.query;
    res.json({ success: true, data: await service.getActions(req.params.orgId, filtersFrom(req), page, limit) });
  } catch (err) { fail(res, err, 'Failed to fetch actions feed'); }
};
