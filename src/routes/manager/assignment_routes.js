const express = require('express');
const router = express.Router();
const controller = require('../../controllers/manager/assignment_controller');
const { authenticate } = require('../../middleware/auth_middleware');
const { requireAnyManagerRole, requireAssignmentVisibility } = require('../../middleware/manager_middleware');

router.use(authenticate);
router.use(requireAnyManagerRole);

router.get('/', controller.listAssignments);
router.post('/', controller.createAssignment);

router.patch('/submissions/:submissionId/review', controller.reviewSubmission);

router.get('/:id', requireAssignmentVisibility, controller.getAssignment);
router.patch('/:id', requireAssignmentVisibility, controller.patchAssignment);
router.get('/:id/submissions', requireAssignmentVisibility, controller.listSubmissions);
router.get('/:id/submissions/:userId/detail', requireAssignmentVisibility, controller.getSubmissionDetail);
router.get('/:id/submissions/:userId/file', requireAssignmentVisibility, controller.downloadSubmissionFile);

module.exports = router;
