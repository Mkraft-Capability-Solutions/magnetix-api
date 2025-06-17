const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify', authController.verify);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;