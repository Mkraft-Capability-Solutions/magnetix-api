const express = require('express');
const router = express.Router();
const controller = require('../../controllers/student/lingo_lab_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All Lingo Lab routes are for the authenticated learner (role 1). Mounted behind
// featureGate("lingo_lab") in app.js, so org-level disabling is enforced too.
router.use(authenticate);
router.use(authorize(1));

// Level 0 — profile / roadmap
router.get('/profile', controller.getProfile);
router.post('/profile', controller.saveProfile);

// Languages — list all started languages + switch the active one
router.get('/languages', controller.getLanguages);
router.post('/languages/switch', controller.switchLanguage);

// Dashboard
router.get('/dashboard', controller.getDashboard);

// Level 1 — vocabulary
router.get('/categories', controller.getCategories);
router.get('/vocabulary', controller.getVocabulary);
router.get('/review', controller.getReview);

// Activity results (updates progress, spaced repetition, XP/streak)
router.post('/activity', controller.submitActivity);

// Level 6 — Text Conversation Lab
router.get('/conversation/scenarios', controller.getScenarios);
router.get('/conversations', controller.listConversations);
router.get('/conversations/:id', controller.getConversation);
router.post('/conversations', controller.startConversation);
router.post('/conversations/:id/message', controller.sendConversationMessage);

module.exports = router;
