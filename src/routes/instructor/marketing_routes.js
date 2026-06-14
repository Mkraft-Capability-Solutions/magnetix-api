const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const MarketingController = require('../../controllers/instructor/marketing_controller');

// Apply authentication middleware
router.use(authenticate);

// Apply authorization - Instructor (2) only
router.use(authorize(2));

/**
 * Instructor Marketing Campaign Routes
 * Instructors can only create campaigns targeting students
 */

// POST /api/instructor/marketing/campaigns - Create new campaign
router.post('/campaigns', MarketingController.createCampaign);

// GET /api/instructor/marketing/campaigns - Get campaigns with filters
router.get('/campaigns', MarketingController.getCampaigns);

// GET /api/instructor/marketing/campaigns/:uuid - Get campaign by UUID
router.get('/campaigns/:uuid', MarketingController.getCampaignById);

// PUT /api/instructor/marketing/campaigns/:uuid - Update campaign
router.put('/campaigns/:uuid', MarketingController.updateCampaign);

// POST /api/instructor/marketing/campaigns/:uuid/send - Send campaign
router.post('/campaigns/:uuid/send', MarketingController.sendCampaign);

// DELETE /api/instructor/marketing/campaigns/:uuid - Delete campaign
router.delete('/campaigns/:uuid', MarketingController.deleteCampaign);

module.exports = router;
