const express = require('express');
const router = express.Router();
const controller = require('../../controllers/super_admin/content_governance_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const { requirePermission } = require('../../middleware/permission_middleware');

router.use(authenticate);
router.use(authorize(4));

// --- Taxonomy
router.get('/taxonomy', requirePermission('content.taxonomy.view'), controller.getTaxonomy);
router.post('/categories', requirePermission('content.taxonomy.manage'), controller.createCategory);
router.put('/categories/:id', requirePermission('content.taxonomy.manage'), controller.updateCategory);
router.delete('/categories/:id', requirePermission('content.taxonomy.manage'), controller.deleteCategory);
router.post('/subcategories', requirePermission('content.taxonomy.manage'), controller.createSubcategory);
router.put('/subcategories/:id', requirePermission('content.taxonomy.manage'), controller.updateSubcategory);
router.delete('/subcategories/:id', requirePermission('content.taxonomy.manage'), controller.deleteSubcategory);

// --- Course lifecycle queue + structure
router.get('/courses', requirePermission('content.course.view'), controller.getCourses);
router.get('/courses/:id/structure', requirePermission('content.course.view'), controller.getCourseStructure);
router.get('/courses/:id/history', requirePermission('content.course.view'), controller.getCourseHistory);

// Lifecycle transition — the required permission depends on the action, so we
// resolve it per-request before delegating to requirePermission.
const LIFECYCLE_PERM_BY_ACTION = {
  submit: 'content.lifecycle.submit',
  approve: 'content.lifecycle.approve',
  reject: 'content.lifecycle.approve',
  archive: 'content.lifecycle.archive',
  restore: 'content.lifecycle.archive'
};
router.patch(
  '/courses/:id/lifecycle',
  (req, res, next) => {
    const key = LIFECYCLE_PERM_BY_ACTION[req.body?.action];
    if (!key) {
      return res.status(400).json({ success: false, message: 'Invalid or missing lifecycle action' });
    }
    return requirePermission(key)(req, res, next);
  },
  controller.transitionLifecycle
);

module.exports = router;
