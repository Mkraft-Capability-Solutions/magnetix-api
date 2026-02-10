const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const MarketingController = require('../../controllers/admin/marketing_controller');

// Apply authentication middleware
router.use(authenticate);

// Apply authorization - Admin (3) and SuperAdmin (4) only
router.use(authorize(3, 4));

/**
 * Marketing Campaign Routes
 */

// GET /api/admin/marketing/audiences - Get audiences with user counts
router.get('/audiences', MarketingController.getAudiences);

// POST /api/admin/marketing/campaigns - Create new campaign
router.post('/campaigns', MarketingController.createCampaign);

// GET /api/admin/marketing/campaigns - Get campaigns with filters
router.get('/campaigns', MarketingController.getCampaigns);

// GET /api/admin/marketing/campaigns/:uuid - Get campaign by UUID
router.get('/campaigns/:uuid', MarketingController.getCampaignById);

// PUT /api/admin/marketing/campaigns/:uuid - Update campaign
router.put('/campaigns/:uuid', MarketingController.updateCampaign);

// POST /api/admin/marketing/campaigns/:uuid/send - Send campaign
router.post('/campaigns/:uuid/send', MarketingController.sendCampaign);

// DELETE /api/admin/marketing/campaigns/:uuid - Delete campaign
router.delete('/campaigns/:uuid', MarketingController.deleteCampaign);

module.exports = router;
