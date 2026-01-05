const express = require('express');
const router = express.Router();
const feedbackController = require('../../controllers/admin/feedback_controller');

// Public endpoints - NO authentication required

// Get public form by slug
router.get('/:slug', feedbackController.getPublicForm);

// Submit response to public form
router.post('/:slug/submit', feedbackController.submitPublicResponse);

module.exports = router;
