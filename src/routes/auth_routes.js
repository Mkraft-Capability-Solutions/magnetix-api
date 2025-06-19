const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const { rateLimit } = require('../middleware/auth_middleware');

// Stricter rate limiting for auth routes
const authLimiter = rateLimit(15 * 60 * 1000, 10); // 10 requests per 15 minutes
const sensitiveLimiter = rateLimit(60 * 60 * 1000, 5); // 5 requests per hour

// Authentication routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/verify', authLimiter, authController.verify);
router.post('/forgot-password', sensitiveLimiter, authController.forgotPassword);
router.post('/reset-password', sensitiveLimiter, authController.resetPassword);

module.exports = router;