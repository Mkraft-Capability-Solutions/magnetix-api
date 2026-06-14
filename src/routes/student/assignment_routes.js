const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../../controllers/student/assignment_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const { requireAssignmentVisibility } = require('../../middleware/manager_middleware');

// 200 MB hard cap at the multer layer; per-assignment cap enforced in service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.use(authenticate);
router.use(authorize(1)); // Learners only

router.get('/', controller.listAssignments);

router.get('/:id', requireAssignmentVisibility, controller.getAssignment);

router.post(
  '/:id/submit-document',
  requireAssignmentVisibility,
  upload.single('file'),
  controller.submitDocument
);

router.post(
  '/:id/submit-assessment',
  requireAssignmentVisibility,
  controller.submitAssessment
);

module.exports = router;
