const express = require('express');
const router = express.Router();
const feedbackController = require('../../controllers/admin/feedback_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply auth to all admin routes
router.use(authenticate);
router.use(authorize(3, 4)); // Admin (3) and Super Admin (4)

// Form CRUD
router.get('/forms', feedbackController.getAllForms);
router.get('/forms/:id', feedbackController.getFormById);
router.post('/forms', feedbackController.createForm);
router.put('/forms/:id', feedbackController.updateForm);
router.delete('/forms/:id', feedbackController.deleteForm);

// Analytics & Responses
router.get('/forms/:id/analytics', feedbackController.getFormAnalytics);
router.get('/forms/:id/responses', feedbackController.getFormResponses);

module.exports = router;
