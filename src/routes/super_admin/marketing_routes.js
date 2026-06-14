const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const MarketingController = require('../../controllers/super_admin/marketing_controller');

// Apply authentication middleware
router.use(authenticate);

// Apply authorization - SuperAdmin (4) only
router.use(authorize(4));

/**
 * Marketing Campaign Routes
 */

// GET /api/super-admin/marketing/users-by-role - Individual users for audience picker
router.get('/users-by-role', MarketingController.getUsersByRole);

// POST /api/super-admin/marketing/validate-emails - Validate CSV-imported emails
router.post('/validate-emails', MarketingController.validateEmails);

// POST /api/super-admin/marketing/campaigns - Create new campaign
router.post('/campaigns', MarketingController.createCampaign);

// GET /api/super-admin/marketing/campaigns - Get campaigns with filters
router.get('/campaigns', MarketingController.getCampaigns);

// GET /api/super-admin/marketing/campaigns/:uuid - Get campaign by UUID
router.get('/campaigns/:uuid', MarketingController.getCampaignById);

// PUT /api/super-admin/marketing/campaigns/:uuid - Update campaign
router.put('/campaigns/:uuid', MarketingController.updateCampaign);

// POST /api/super-admin/marketing/campaigns/:uuid/send - Send campaign
router.post('/campaigns/:uuid/send', MarketingController.sendCampaign);

// DELETE /api/super-admin/marketing/campaigns/:uuid - Delete campaign
router.delete('/campaigns/:uuid', MarketingController.deleteCampaign);

module.exports = router;
