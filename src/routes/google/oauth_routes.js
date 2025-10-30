const express = require('express');
const router = express.Router();
const meetController = require('../../controllers/google/meet_controller');

/**
 * Google OAuth Routes
 *
 * These routes handle OAuth 2.0 authorization flow
 * No authentication required for initial setup and callback
 */

/**
 * @route   GET /google/oauth/setup
 * @desc    Get OAuth authorization URL for initial setup
 * @access  Public (for initial Google API configuration)
 * @note    This is a public endpoint to allow administrators to set up Google OAuth
 *          without requiring prior authentication. Use this to get the GOOGLE_REFRESH_TOKEN.
 */
router.get('/setup', meetController.getAuthUrlPublic);

/**
 * @route   GET /google/oauth/auth-url
 * @desc    Get OAuth authorization URL (alternative public endpoint)
 * @access  Public
 */
router.get('/auth-url', meetController.getAuthUrlPublic);

/**
 * @route   GET /google/oauth/callback
 * @desc    OAuth 2.0 callback handler
 * @access  Public (but requires valid authorization code from Google)
 * @query   code - Authorization code from Google
 */
router.get('/callback', meetController.handleOAuthCallback);

module.exports = router;
