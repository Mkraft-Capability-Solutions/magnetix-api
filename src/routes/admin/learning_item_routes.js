const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/learning_item_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const learningItemService = require('../../services/admin/learning_item_service');

// Block all requests until tables are ready
let tablesReady = false;
learningItemService.ensureTablesExist().then(() => { tablesReady = true; });

router.use(async (req, res, next) => {
  if (!tablesReady) await learningItemService.ensureTablesExist();
  next();
});

router.use(authenticate);
router.use(authorize(3, 4)); // Admin (3) and Super Admin (4)

// ── Catalogue ──────────────────────────────────────────────────────────────
router.get('/catalogue/courses',  ctrl.getCourses);
router.get('/catalogue/quizzes',  ctrl.getQuizzes);

// ── Instances CRUD ─────────────────────────────────────────────────────────
router.get('/',            ctrl.getInstances);
router.post('/',           ctrl.createInstance);
router.get('/:id',         ctrl.getInstanceById);
router.put('/:id',         ctrl.updateInstance);
router.delete('/:id',      ctrl.deleteInstance);
router.patch('/:id/close', ctrl.closeInstance);

// ── Progress ───────────────────────────────────────────────────────────────
router.get('/:id/progress', ctrl.getInstanceProgress);

module.exports = router;
