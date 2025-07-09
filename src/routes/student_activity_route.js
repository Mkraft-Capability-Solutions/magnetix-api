const express = require('express');
const router = express.Router();
const activityController = require('../controllers/student_activity_controller');
const { authenticate, authorize } = require('../middleware/auth_middleware');
const rateLimit = require('express-rate-limit');

const activityLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60, // 60 requests per 5 minutes
  message: 'Too many activity log attempts, please try again later'
});

router.post('/log', authenticate, authorize(1), activityLimiter, activityController.logSession);
router.get('/weekly', authenticate, authorize(1), activityController.getWeeklyHours);

module.exports = router;