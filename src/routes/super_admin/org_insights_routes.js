const express = require('express');
const router = express.Router();
const controller = require('../../controllers/super_admin/org_insights_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All org-insights routes require an authenticated super admin (role 4).
router.use(authenticate);
router.use(authorize(4));

/**
 * GET /api/super-admin/org-insights/overview
 * All-organizations comparison overview.
 * Query: startDate, endDate, roleId, status
 */
router.get('/overview', controller.getOverview);

/**
 * Per-organization sections.
 * Query: startDate, endDate, roleId, status  (actions also: page, limit)
 */
router.get('/:orgId/summary', controller.getSummary);
router.get('/:orgId/engagement', controller.getEngagement);
router.get('/:orgId/learning', controller.getLearning);
router.get('/:orgId/operations', controller.getOperations);
router.get('/:orgId/actions', controller.getActions);

module.exports = router;
