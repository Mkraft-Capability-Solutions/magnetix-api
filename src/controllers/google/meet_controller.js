const googleMeetService = require('../../services/google/google_meet_service');
const Joi = require('joi');

/**
 * Google Meet Controller
 * Handles HTTP requests for Google Meet link generation
 */

// Validation schemas
const quickMeetLinkSchema = Joi.object({
  title: Joi.string().min(1).max(100).optional().default('Quick Meeting'),
  description: Joi.string().max(500).optional().allow(''),
});

const createMeetLinkSchema = Joi.object({
  title: Joi.string().min(1).max(100).optional().default('Meeting'),
  description: Joi.string().max(500).optional().allow(''),
  startTime: Joi.string().isoDate().optional(),
  endTime: Joi.string().isoDate().optional(),
  attendees: Joi.array().items(Joi.string().email()).optional().default([]),
});

/**
 * Generate a quick Google Meet link
 * POST /api/google/meet/quick
 */
exports.generateQuickMeetLink = async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = quickMeetLinkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${error.details[0].message}`,
      });
    }

    console.log(`🔄 Request to generate Meet link: "${value.title}"`);

    // Generate Meet link
    const result = await googleMeetService.createQuickMeetLink(value.title);

    // Log success
    console.log(`✅ Meet link generated successfully: ${result.meetLink}`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        meetLink: result.meetLink,
        eventId: result.eventId,
        htmlLink: result.htmlLink,
        conferenceId: result.conferenceId,
        mode: result.mode,
        note: result.note,
        ...(result.eventDetails && { eventDetails: result.eventDetails })
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Generate Quick Meet Link Error:', error.message);

    // Try ultimate fallback in controller as well
    try {
      console.log('🔄 Attempting controller-level fallback...');
      const fallbackResult = await googleMeetService.createUltimateFallbackLink(req.body?.title);
      
      res.status(200).json({
        success: true,
        message: fallbackResult.message,
        data: {
          meetLink: fallbackResult.meetLink,
          eventId: fallbackResult.eventId,
          htmlLink: fallbackResult.htmlLink,
          conferenceId: fallbackResult.conferenceId,
          mode: fallbackResult.mode,
          note: fallbackResult.note,
        },
        timestamp: new Date().toISOString(),
        note: 'Generated via fallback method'
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate Meet link',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

/**
 * Create Meet link with details
 * POST /api/google/meet/create
 */
exports.createMeetLink = async (req, res, next) => {
  try {
    const { error, value } = createMeetLinkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${error.details[0].message}`,
      });
    }

    console.log(`🔄 Request to create detailed Meet link: "${value.title}"`);

    const result = await googleMeetService.createMeetLink(value);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        meetLink: result.meetLink,
        eventId: result.eventId,
        htmlLink: result.htmlLink,
        conferenceId: result.conferenceId,
        mode: result.mode,
        note: result.note,
        ...(result.eventDetails && { eventDetails: result.eventDetails })
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Create Meet Link Error:', error.message);

    // Fallback
    try {
      const fallbackResult = await googleMeetService.createUltimateFallbackLink(req.body?.title);
      
      res.status(200).json({
        success: true,
        message: fallbackResult.message,
        data: fallbackResult,
        timestamp: new Date().toISOString(),
        note: 'Generated via fallback method'
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Failed to create Meet link',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Service error',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

/**
 * Health check endpoint
 * GET /api/google/meet/health
 */
exports.healthCheck = async (req, res) => {
  try {
    const healthInfo = await googleMeetService.healthCheck();

    res.json({
      success: true,
      message: 'Google Meet service is running',
      data: healthInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Google Meet service health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Service information
 * GET /api/google/meet/info
 */
exports.getServiceInfo = async (req, res) => {
  res.json({
    success: true,
    message: 'Google Meet Service Information',
    data: {
      service: 'google-meet-generator',
      version: '1.0.0',
      description: 'Generates Google Meet links for personal Gmail accounts',
      features: [
        'Real Google Meet link generation via Calendar API',
        'Smart fallback link generation',
        'Ultimate fallback to meet.google.com/new',
        'Multiple generation strategies'
      ],
      endpoints: {
        quick: 'POST /google/meet/quick',
        create: 'POST /google/meet/create',
        health: 'GET /google/meet/health',
        info: 'GET /google/meet/info'
      }
    },
    timestamp: new Date().toISOString(),
  });
};