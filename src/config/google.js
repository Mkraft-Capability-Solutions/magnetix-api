require('dotenv').config();

const googleConfig = {
  // OAuth 2.0 Configuration for Personal Gmail
  oauth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google/oauth/callback',
  },

  // Calendar Configuration
  calendar: {
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeZone: process.env.TIMEZONE || 'Asia/Kolkata',
  },

  // API Scopes
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],

  // Validate configuration
  validate: function() {
    if (!this.oauth.clientId || !this.oauth.clientSecret) {
      console.warn('⚠️  Google OAuth credentials not found. Using fallback mode.');
      return false;
    }
    return true;
  }
};

module.exports = googleConfig;