const express = require('express');
const router = express.Router();
const controller = require('../../controllers/super_admin/transcript_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Super-admin only.
router.use(authenticate);
router.use(authorize(4));

router.get('/learners', controller.getLearners);
router.get('/bulk', controller.getBulkTranscripts);
router.get('/:userId/full', controller.getFullTranscript);

module.exports = router;
