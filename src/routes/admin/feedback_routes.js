const express = require('express');
const router = express.Router();
const feedbackController = require('../../controllers/admin/feedback_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply auth to all admin routes
router.use(authenticate);

// AI Question Generation
router.post('/forms/ai-generate-questions', authorize(3, 4), feedbackController.generateAssessmentQuestions);

// Form CRUD - GET forms is accessible to instructors too (for quiz lesson dropdown)
router.get('/forms', authorize(2, 3, 4), feedbackController.getAllForms);
router.get('/forms/:id', authorize(2, 3, 4), feedbackController.getFormById);
router.post('/forms', authorize(3, 4), feedbackController.createForm);
router.put('/forms/:id', authorize(3, 4), feedbackController.updateForm);
router.delete('/forms/:id', authorize(3, 4), feedbackController.deleteForm);

// Analytics & Responses
router.get('/forms/:id/analytics', authorize(3, 4), feedbackController.getFormAnalytics);
router.get('/forms/:id/responses/paginated', authorize(3, 4), feedbackController.getFormResponsesPaginated);
router.get('/forms/:id/responses', authorize(3, 4), feedbackController.getFormResponses);
router.get('/responses/:id', authorize(3, 4), feedbackController.getResponseById);

// Subjective assessment scoring
router.post('/responses/:id/ai-score', authorize(3, 4), feedbackController.aiScoreResponse);
router.put('/responses/:id/score', authorize(3, 4), feedbackController.updateManualScores);

// Submissions - All submissions across all forms
router.get('/submissions', authorize(3, 4), feedbackController.getAllSubmissions);

module.exports = router;
