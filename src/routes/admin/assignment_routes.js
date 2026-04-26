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

// Assessment library lookup for the create-assignment dropdown
// (must be declared BEFORE /:id so it's not captured as an assignment id).
router.get('/assessment-options', controller.listAssessmentOptions);

// Submission review (uses /:submissionId path param distinct from assignment id)
router.patch('/submissions/:submissionId/review', controller.reviewSubmission);

// Send assessment-result email to learner
router.post('/submissions/:submissionId/email-result', controller.emailSubmissionResult);

// Per-assignment endpoints (visibility-checked)
router.get('/:id', requireAssignmentVisibility, controller.getAssignment);
router.patch('/:id', requireAssignmentVisibility, controller.patchAssignment);
router.delete('/:id', requireAssignmentVisibility, controller.deleteAssignment);
router.get('/:id/submissions', requireAssignmentVisibility, controller.listSubmissions);
router.get('/:id/submissions/:userId/detail', requireAssignmentVisibility, controller.getSubmissionDetail);
router.get('/:id/submissions/:userId/file', requireAssignmentVisibility, controller.downloadSubmissionFile);

module.exports = router;
