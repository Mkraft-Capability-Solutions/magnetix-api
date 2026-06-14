require('dotenv').config();

/**
 * Gemini AI Configuration
 *
 * This configuration file manages Google Gemini API credentials and settings
 * for AI-powered learning path generation.
 *
 * Setup Instructions:
 * 1. Go to Google AI Studio (https://aistudio.google.com/)
 * 2. Create an API key
 * 3. Add the key to your .env file as GEMINI_API_KEY
 *
 * Required Environment Variables:
 * - GEMINI_API_KEY: Your Gemini API key
 * - GEMINI_MODEL: (Optional) Model name, defaults to gemini-1.5-flash
 */

const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY,

  model: {
    name: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  },

  // Validation
  validate() {
    if (!this.apiKey) {
      console.warn('⚠️  Missing GEMINI_API_KEY in environment variables');
      console.warn('AI Learning Path generation will not work until this is configured.');
      return false;
    }
    return true;
  },
};

module.exports = geminiConfig;
