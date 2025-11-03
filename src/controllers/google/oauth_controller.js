const { google } = require('googleapis');
const googleConfig = require('../../config/google');

/**
 * OAuth Controller for Google Meet Integration
 */
class OAuthController {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      googleConfig.oauth.clientId,
      googleConfig.oauth.clientSecret,
      googleConfig.oauth.redirectUri
    );
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl = (req, res) => {
    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: googleConfig.scopes,
        prompt: 'consent',
        state: JSON.stringify({
          redirect: req.query.redirect || '/',
          timestamp: Date.now()
        })
      });

      console.log('🔐 Generated OAuth URL:', authUrl);

      res.json({
        success: true,
        message: 'OAuth authorization URL generated',
        data: {
          authUrl: authUrl,
          clientId: googleConfig.oauth.clientId,
          redirectUri: googleConfig.oauth.redirectUri
        }
      });

    } catch (error) {
      console.error('❌ Error generating OAuth URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate OAuth URL',
        error: error.message
      });
    }
  };

  /**
   * Handle OAuth callback
   */
  handleCallback = async (req, res) => {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }

      console.log('🔄 Exchanging authorization code for tokens...');

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      console.log('✅ Tokens received successfully');

      // Redirect to frontend with tokens (in production, store in database)
      const frontendUrl = new URL(process.env.FRONTEND_URL);
      frontendUrl.searchParams.set('oauth_success', 'true');
      frontendUrl.searchParams.set('access_token', tokens.access_token);
      frontendUrl.searchParams.set('refresh_token', tokens.refresh_token || '');
      frontendUrl.searchParams.set('expiry_date', tokens.expiry_date);

      console.log('🔗 Redirecting to frontend with tokens');

      res.redirect(frontendUrl.toString());

    } catch (error) {
      console.error('❌ OAuth callback error:', error);

      // Redirect to frontend with error
      const frontendUrl = new URL(process.env.FRONTEND_URL);
      frontendUrl.searchParams.set('oauth_error', 'true');
      frontendUrl.searchParams.set('error_message', error.message);

      res.redirect(frontendUrl.toString());
    }
  };

  /**
   * Get OAuth configuration for frontend
   */
  getConfig = (req, res) => {
    res.json({
      success: true,
      message: 'OAuth configuration',
      data: {
        clientId: googleConfig.oauth.clientId,
        redirectUri: googleConfig.oauth.redirectUri,
        scopes: googleConfig.scopes
      }
    });
  };

  /**
   * NEW: Check OAuth authentication status
   */
  checkAuthStatus = async (req, res) => {
    try {
      // TODO: Implement proper token validation from your database
      // For now, return basic status
      const hasValidConfig = !!(googleConfig.oauth.clientId && googleConfig.oauth.clientSecret);
      
      res.json({
        success: true,
        data: {
          authenticated: false, // You'll need to implement proper session/token validation
          hasConfig: hasValidConfig,
          message: hasValidConfig ? 'OAuth configured - visit /google/oauth/auth-url to authenticate' : 'OAuth not configured'
        }
      });
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking authentication status'
      });
    }
  };
}

module.exports = new OAuthController();