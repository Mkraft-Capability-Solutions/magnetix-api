require('dotenv').config();

/**
 * Google API Configuration
 *
 * This configuration file manages Google API credentials and settings
 * for Google Meet and Google Calendar integration.
 *
 * Setup Instructions:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. Create a new project or select existing one
 * 3. Enable Google Calendar API
 * 4. Enable Google Meet API (if available in your region)
 * 5. Create OAuth 2.0 credentials (Web application)
 * 6. Add authorized redirect URIs
 * 7. Download credentials and add to .env file
 *
 * Required Environment Variables:
 * - GOOGLE_CLIENT_ID: OAuth 2.0 client ID
 * - GOOGLE_CLIENT_SECRET: OAuth 2.0 client secret
 * - GOOGLE_REDIRECT_URI: OAuth callback URL
 * - GOOGLE_REFRESH_TOKEN: Admin refresh token for server-to-server auth
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: (Optional) For service account approach
 */

const googleConfig = {
  // OAuth 2.0 Configuration
  oauth2: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Fixed: Use proper environment-based redirect URI with fallback chain
    redirectUri: process.env.GOOGLE_REDIRECT_URI ||
                 (process.env.NODE_ENV === 'production'
                   ? `${process.env.BACKEND_URL}/api/google/oauth/callback`
                   : 'http://localhost:5000/api/google/oauth/callback'),
  },

  // Admin Credentials (for server-side operations)
  admin: {
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  },

  // API Scopes Required
  scopes: [
    'https://www.googleapis.com/auth/calendar',           // Full calendar access
    'https://www.googleapis.com/auth/calendar.events',    // Calendar events
    'https://www.googleapis.com/auth/meetings.space.created', // Google Meet (if available)
  ],

  // Google Calendar Settings
  calendar: {
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeZone: process.env.GOOGLE_CALENDAR_TIMEZONE || 'UTC',
  },

  // Google Meet Settings
  meet: {
    // Google Meet conference data version
    conferenceDataVersion: 1,

    // Default meeting settings
    defaultSettings: {
      enableVideo: true,
      enableAudio: true,
      enableChat: true,
      enableRecording: false,
    },
  },

  // Validation
  validate() {
    const missing = [];

    if (!this.oauth2.clientId) missing.push('GOOGLE_CLIENT_ID');
    if (!this.oauth2.clientSecret) missing.push('GOOGLE_CLIENT_SECRET');

    if (missing.length > 0) {
      console.warn(`⚠️  Missing Google API configuration: ${missing.join(', ')}`);
      console.warn('Google Meet integration will not work until these are configured.');
      return false;
    }

    return true;
  },
};

module.exports = googleConfig;
