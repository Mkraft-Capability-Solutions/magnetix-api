const hierarchyService = require('../../services/super_admin/hierarchy_service');

/**
 * Org Hierarchy Controller — reporting-line org chart + manager reassignment.
 * Super-admin gated at the router level.
 */

const getTree = async (req, res, next) => {
  try {
    const { rootUuid, depth } = req.query;
    const data = await hierarchyService.getTree({ rootUuid, depth });
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const searchUsers = async (req, res, next) => {
  try {
    const results = await hierarchyService.searchUsers(req.query.q);
    res.status(200).json({ success: true, data: results });
  } catch (error) { next(error); }
};

const getUserNode = async (req, res, next) => {
  try {
    const node = await hierarchyService.getUserNode(req.params.uuid);
    if (!node) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: node });
  } catch (error) { next(error); }
};

const reassignManager = async (req, res, next) => {
  try {
    const { managerUuid } = req.body || {};
    const result = await hierarchyService.reassignManager(
      req.params.uuid,
      managerUuid ?? null,
      req.user.uuid
    );
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }
    res.status(200).json(result);
  } catch (error) { next(error); }
};

module.exports = { getTree, searchUsers, getUserNode, reassignManager };
