const { google } = require('googleapis');
const googleConfig = require('../../config/google');

/**
 * Google Meet Service
 *
 * This service handles Google Meet link generation using Google Calendar API.
 * Google Meet links are created as part of Google Calendar events.
 *
 * IMPORTANT: Google Meet API is not publicly available as a standalone API.
 * We use Google Calendar API with conference data to create Meet links.
 */
class GoogleMeetService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.initialized = false;
  }

  /**
   * Initialize OAuth2 client with credentials
   */
  async initialize() {
    try {
      if (!googleConfig.validate()) {
        throw new Error('Google API configuration is incomplete. Please check .env file.');
      }

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        googleConfig.oauth2.clientId,
        googleConfig.oauth2.clientSecret,
        googleConfig.oauth2.redirectUri
      );

      // Set refresh token if available
      if (googleConfig.admin.refreshToken) {
        this.oauth2Client.setCredentials({
          refresh_token: googleConfig.admin.refreshToken,
        });
      }

      // Initialize Calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      this.initialized = true;
      console.log('✅ Google Meet Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Meet Service:', error.message);
      throw error;
    }
  }

  /**
   * Ensure service is initialized before use
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Create a Google Meet link by creating a Calendar event
   *
   * @param {Object} eventDetails - Event details
   * @param {string} eventDetails.title - Event title
   * @param {string} eventDetails.description - Event description
   * @param {string} eventDetails.startDateTime - Start date-time (ISO 8601)
   * @param {string} eventDetails.endDateTime - End date-time (ISO 8601)
   * @param {Array<string>} eventDetails.attendees - Array of attendee emails
   * @param {string} eventDetails.timeZone - Timezone (default: UTC)
   *
   * @returns {Promise<Object>} - { meetLink, eventId, htmlLink }
   */
  async createMeetLink(eventDetails) {
    await this.ensureInitialized();

    try {
      const {
        title,
        description = '',
        startDateTime,
        endDateTime,
        attendees = [],
        timeZone = googleConfig.calendar.timeZone,
      } = eventDetails;

      // Validate required fields
      if (!title || !startDateTime || !endDateTime) {
        throw new Error('Title, startDateTime, and endDateTime are required');
      }

      // Prepare attendees list
      const attendeesList = attendees.map((email) => ({ email }));

      // Create calendar event with Google Meet conference
      const event = {
        summary: title,
        description: description,
        start: {
          dateTime: startDateTime,
          timeZone: timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timeZone,
        },
        attendees: attendeesList,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet', // This creates a Google Meet link
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 },      // 30 minutes before
          ],
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true,
      };

      // Insert event into calendar with conference data
      const response = await this.calendar.events.insert({
        calendarId: googleConfig.calendar.calendarId,
        conferenceDataVersion: googleConfig.meet.conferenceDataVersion,
        sendUpdates: 'none', // Don't send invites automatically
        requestBody: event,
      });

      const createdEvent = response.data;
      const meetLink = createdEvent.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video'
      )?.uri;

      if (!meetLink) {
        throw new Error('Failed to generate Google Meet link. Please check API permissions.');
      }

      return {
        success: true,
        meetLink: meetLink,
        eventId: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        conferenceId: createdEvent.conferenceData?.conferenceId,
      };
    } catch (error) {
      console.error('Error creating Google Meet link:', error);
      throw new Error(`Failed to create Google Meet link: ${error.message}`);
    }
  }

  /**
   * Create a simple Meet link without full event details
   * (Quick generation for ad-hoc meetings)
   *
   * @param {string} title - Meeting title
   * @returns {Promise<Object>} - { meetLink, eventId }
   */
  async createQuickMeetLink(title = 'Quick Meeting') {
    const now = new Date();
    const startDateTime = now.toISOString();
    const endDateTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour duration

    return await this.createMeetLink({
      title,
      description: 'Auto-generated Google Meet link',
      startDateTime,
      endDateTime,
      attendees: [],
    });
  }

  /**
   * Update an existing calendar event with new details
   *
   * @param {string} eventId - Google Calendar event ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated event data
   */
  async updateMeetEvent(eventId, updates) {
    await this.ensureInitialized();

    try {
      const response = await this.calendar.events.patch({
        calendarId: googleConfig.calendar.calendarId,
        eventId: eventId,
        requestBody: updates,
        sendUpdates: 'none',
      });

      return {
        success: true,
        event: response.data,
      };
    } catch (error) {
      console.error('Error updating Google Meet event:', error);
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Delete a Google Meet event
   *
   * @param {string} eventId - Google Calendar event ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteMeetEvent(eventId) {
    await this.ensureInitialized();

    try {
      await this.calendar.events.delete({
        calendarId: googleConfig.calendar.calendarId,
        eventId: eventId,
        sendUpdates: 'none',
      });

      return {
        success: true,
        message: 'Event deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting Google Meet event:', error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Get OAuth2 authorization URL for user consent
   *
   * @returns {string} - Authorization URL
   */
  getAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.oauth2.clientId,
      googleConfig.oauth2.clientSecret,
      googleConfig.oauth2.redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: googleConfig.scopes,
      prompt: 'consent',
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} - Tokens
   */
  async getTokensFromCode(code) {
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.oauth2.clientId,
      googleConfig.oauth2.clientSecret,
      googleConfig.oauth2.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }
}

// Export singleton instance
module.exports = new GoogleMeetService();
