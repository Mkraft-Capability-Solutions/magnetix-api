const express = require('express');
const router = express.Router();
const controller = require('../../controllers/super_admin/lingo_lab_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Super Admin only.
router.use(authenticate);
router.use(authorize(4));

router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);

// Content seeding
router.get('/vocabulary/summary', controller.vocabularySummary);
router.post('/vocabulary/generate', controller.generateVocabulary);
router.post('/vocabulary', controller.addVocabulary);
router.delete('/vocabulary', controller.deleteVocabulary);

module.exports = router;
