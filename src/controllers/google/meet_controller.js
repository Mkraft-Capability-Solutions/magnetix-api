const googleMeetService = require('../../services/google/google_meet_service');
const Joi = require('joi');

/**
 * Google Meet Controller
 *
 * Handles HTTP requests for Google Meet link generation and management
 */

// Validation schema for quick meet link generation
const quickMeetLinkSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().default('Quick Meeting'),
});

// Validation schema for full meet link generation
const createMeetLinkSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  startDateTime: Joi.string().isoDate().required(),
  endDateTime: Joi.string().isoDate().required(),
  attendees: Joi.array().items(Joi.string().email()).optional().default([]),
  timeZone: Joi.string().optional().default('UTC'),
});

/**
 * Generate a quick Google Meet link
 *
 * POST /api/google/meet/quick
 * Body: { title?: string }
 */
exports.generateQuickMeetLink = async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = quickMeetLinkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Generate Meet link
    const result = await googleMeetService.createQuickMeetLink(value.title);

    res.status(201).json({
      success: true,
      message: 'Google Meet link generated successfully',
      data: {
        meetLink: result.meetLink,
        eventId: result.eventId,
        htmlLink: result.htmlLink,
        conferenceId: result.conferenceId,
        mode: 'real_api',
      },
    });
  } catch (error) {
    console.error('Generate Quick Meet Link Error:', error);

    // Handle specific error cases
    if (error.message.includes('configuration is incomplete')) {
      return res.status(503).json({
        success: false,
        message: 'Google Meet integration is not configured. Please contact administrator.',
        error: {
          code: 'GOOGLE_API_NOT_CONFIGURED',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }

    if (error.message.includes('permissions')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create Google Meet links',
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          details: 'Please ensure Google Calendar API is enabled and proper scopes are granted.',
        },
      });
    }

    next(error);
  }
};

/**
 * Generate a Google Meet link with full event details
 *
 * POST /api/google/meet/create
 * Body: { title, description?, startDateTime, endDateTime, attendees?, timeZone? }
 */
exports.createMeetLink = async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = createMeetLinkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Validate date range
    const start = new Date(value.startDateTime);
    const end = new Date(value.endDateTime);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date-time must be after start date-time',
      });
    }

    // Generate Meet link
    const result = await googleMeetService.createMeetLink(value);

    res.status(201).json({
      success: true,
      message: 'Google Meet link created successfully',
      data: {
        meetLink: result.meetLink,
        eventId: result.eventId,
        htmlLink: result.htmlLink,
        conferenceId: result.conferenceId,
        mode: 'real_api',
      },
    });
  } catch (error) {
    console.error('Create Meet Link Error:', error);

    if (error.message.includes('configuration is incomplete')) {
      return res.status(503).json({
        success: false,
        message: 'Google Meet integration is not configured',
        error: { code: 'GOOGLE_API_NOT_CONFIGURED' },
      });
    }

    next(error);
  }
};

/**
 * Update an existing Google Meet event
 *
 * PATCH /api/google/meet/:eventId
 * Body: { title?, description?, startDateTime?, endDateTime? }
 */
exports.updateMeetEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    const result = await googleMeetService.updateMeetEvent(eventId, updates);

    res.json({
      success: true,
      message: 'Google Meet event updated successfully',
      data: result.event,
    });
  } catch (error) {
    console.error('Update Meet Event Error:', error);
    next(error);
  }
};

/**
 * Delete a Google Meet event
 *
 * DELETE /api/google/meet/:eventId
 */
exports.deleteMeetEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required',
      });
    }

    await googleMeetService.deleteMeetEvent(eventId);

    res.json({
      success: true,
      message: 'Google Meet event deleted successfully',
    });
  } catch (error) {
    console.error('Delete Meet Event Error:', error);
    next(error);
  }
};

/**
 * Get OAuth authorization URL (Protected - Admin only)
 *
 * GET /api/google/meet/auth-url
 */
exports.getAuthUrl = async (req, res, next) => {
  try {
    const authUrl = googleMeetService.getAuthUrl();

    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error('Get Auth URL Error:', error);
    next(error);
  }
};

/**
 * Get OAuth authorization URL (Public - for initial setup)
 *
 * GET /api/google/oauth/setup
 * GET /api/google/oauth/auth-url
 */
exports.getAuthUrlPublic = async (req, res, next) => {
  try {
    const authUrl = googleMeetService.getAuthUrl();

    res.json({
      success: true,
      message: 'Please visit this URL to authorize the application',
      data: {
        authUrl,
        instructions: [
          '1. Visit the authorization URL below',
          '2. Sign in with your Google account',
          '3. Grant the requested permissions',
          '4. You will be redirected to the callback URL',
          '5. Copy the refresh_token from the response',
          '6. Add it to your .env file as GOOGLE_REFRESH_TOKEN'
        ]
      },
    });
  } catch (error) {
    console.error('Get Auth URL Error:', error);

    // Provide helpful error messages for common issues
    if (error.message.includes('GOOGLE_CLIENT_ID')) {
      return res.status(500).json({
        success: false,
        message: 'Google OAuth is not configured properly',
        error: {
          code: 'MISSING_CREDENTIALS',
          details: 'GOOGLE_CLIENT_ID is not set in environment variables. Please check your .env file.',
        },
      });
    }

    if (error.message.includes('GOOGLE_CLIENT_SECRET')) {
      return res.status(500).json({
        success: false,
        message: 'Google OAuth is not configured properly',
        error: {
          code: 'MISSING_CREDENTIALS',
          details: 'GOOGLE_CLIENT_SECRET is not set in environment variables. Please check your .env file.',
        },
      });
    }

    next(error);
  }
};

/**
 * OAuth callback handler
 *
 * GET /api/google/oauth/callback?code=...
 */
exports.handleOAuthCallback = async (req, res, next) => {
  try {
    const { code, error: oauthError, error_description } = req.query;

    // Handle OAuth errors from Google
    if (oauthError) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Authorization Failed</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            h1 { color: #c00; }
            code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Authorization Failed</h1>
            <p><strong>Error:</strong> ${oauthError}</p>
            <p><strong>Description:</strong> ${error_description || 'Unknown error occurred'}</p>
            <p>Please try again or contact your administrator.</p>
          </div>
        </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Missing Authorization Code</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
            h1 { color: #c00; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Authorization Code Missing</h1>
            <p>No authorization code was provided. Please restart the OAuth flow.</p>
          </div>
        </body>
        </html>
      `);
    }

    const tokens = await googleMeetService.getTokensFromCode(code);

    // Return a nice HTML page with the tokens
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google OAuth Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .success {
            background-color: #e8f5e9;
            border: 2px solid #4caf50;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          h1 { color: #2e7d32; margin-top: 0; }
          .token-box {
            background-color: #fff;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            word-wrap: break-word;
          }
          .token-label {
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
          }
          .token-value {
            font-family: 'Courier New', monospace;
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
            font-size: 12px;
          }
          .instructions {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .instructions h2 {
            margin-top: 0;
            color: #856404;
          }
          .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          .instructions li {
            margin: 8px 0;
          }
          code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          .copy-btn {
            background-color: #4285f4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
          }
          .copy-btn:hover {
            background-color: #3367d6;
          }
          .copy-btn:active {
            background-color: #2851a3;
          }
          .copied {
            background-color: #34a853 !important;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅ Google OAuth Authorization Successful!</h1>
          <p>Your application has been authorized to access Google Calendar and create Google Meet links.</p>
        </div>

        <div class="token-box">
          <div class="token-label">🔑 Refresh Token (Important!):</div>
          <div class="token-value" id="refreshToken">${tokens.refresh_token || 'Not available - may already be configured'}</div>
          ${tokens.refresh_token ? '<button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>' : ''}
        </div>

        ${tokens.access_token ? `
        <div class="token-box">
          <div class="token-label">Access Token (expires in ${Math.floor((tokens.expiry_date - Date.now()) / 1000 / 60)} minutes):</div>
          <div class="token-value">${tokens.access_token}</div>
        </div>
        ` : ''}

        <div class="instructions">
          <h2>📝 Next Steps:</h2>
          <ol>
            <li>Copy the <strong>Refresh Token</strong> from above ${tokens.refresh_token ? '(click the copy button)' : ''}</li>
            <li>Open your <code>.env</code> file in the backend directory</li>
            <li>Find the line: <code>GOOGLE_REFRESH_TOKEN=</code></li>
            <li>Paste the refresh token after the equals sign:<br>
                <code>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || 'YOUR_REFRESH_TOKEN_HERE'}</code>
            </li>
            <li>Save the <code>.env</code> file</li>
            <li>Restart your backend server</li>
            <li>Your Google Meet integration is now ready to use! 🎉</li>
          </ol>
          ${!tokens.refresh_token ? '<p><strong>Note:</strong> If no refresh token is shown, it may already be configured in your system.</p>' : ''}
        </div>

        <script>
          function copyToken() {
            const tokenText = document.getElementById('refreshToken').textContent;
            navigator.clipboard.writeText(tokenText).then(() => {
              const btn = event.target;
              btn.textContent = '✅ Copied!';
              btn.classList.add('copied');
              setTimeout(() => {
                btn.textContent = '📋 Copy Token';
                btn.classList.remove('copied');
              }, 2000);
            }).catch(err => {
              alert('Failed to copy. Please select and copy manually.');
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Callback Error:', error);

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
          h1 { color: #c00; }
          pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ OAuth Processing Error</h1>
          <p><strong>Error:</strong> ${error.message}</p>
          ${process.env.NODE_ENV === 'development' ? `<pre>${error.stack}</pre>` : ''}
          <p>Please check your Google API configuration and try again.</p>
        </div>
      </body>
      </html>
    `);
  }
};
