const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth_middleware');


const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many attempts, please try again later'
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/verify', authLimiter, authController.verify);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/resend-verification', authLimiter, authController.resendVerification);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh-token', authController.refreshToken); 

module.exports = router;