const express = require('express');
const router = express.Router();
const oauthController = require('../../controllers/google/oauth_controller');

/**
 * Google OAuth Routes
 * No authentication required for these routes
 */

/**
 * @route   GET /google/oauth/auth-url
 * @desc    Get OAuth authorization URL
 * @access  Public
 * @query   redirect? - Optional redirect URL after auth
 */
router.get('/auth-url', oauthController.getAuthUrl);

/**
 * @route   GET /google/oauth/callback
 * @desc    OAuth callback handler
 * @access  Public
 * @query   code - Authorization code from Google
 * @query   state - State parameter
 */
router.get('/callback', oauthController.handleCallback);

/**
 * @route   GET /google/oauth/config
 * @desc    Get OAuth configuration
 * @access  Public
 */
router.get('/config', oauthController.getConfig);

/**
 * @route   GET /google/oauth/status
 * @desc    Check OAuth authentication status
 * @access  Public
 */
router.get('/status', oauthController.checkAuthStatus); // ADD THIS LINE

module.exports = router;