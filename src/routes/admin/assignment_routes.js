const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/assignment_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const { requireAssignmentVisibility } = require('../../middleware/manager_middleware');

router.use(authenticate);
router.use(authorize(3, 4));

// CRUD
router.post('/', controller.createAssignment);
router.get('/', controller.listAssignments);

// Submission review (uses /:submissionId path param distinct from assignment id)
router.patch('/submissions/:submissionId/review', controller.reviewSubmission);

// Per-assignment endpoints (visibility-checked)
router.get('/:id', requireAssignmentVisibility, controller.getAssignment);
router.patch('/:id', requireAssignmentVisibility, controller.patchAssignment);
router.delete('/:id', requireAssignmentVisibility, controller.deleteAssignment);
router.get('/:id/submissions', requireAssignmentVisibility, controller.listSubmissions);
router.get('/:id/submissions/:userId/file', requireAssignmentVisibility, controller.downloadSubmissionFile);

module.exports = router;
