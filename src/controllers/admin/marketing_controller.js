const MarketingService = require('../../services/admin/marketing_service');
const { v4: uuidv4 } = require('uuid');

class MarketingController {
  // Create a new marketing campaign
  static async createCampaign(req, res) {
    try {
      const { title, subject, message, targetAudience, deliveryMethod, scheduledFor } = req.body;
      const createdBy = req.user.uuid;

      // Validation
      if (!title || !subject || !message || !targetAudience) {
        return res.status(400).json({
          success: false,
          error: { message: 'Missing required fields: title, subject, message, targetAudience' }
        });
      }

      const campaignUuid = uuidv4();
      const result = await MarketingService.createCampaign(
        {
          uuid: campaignUuid,
          title,
          subject,
          message,
          targetAudience,
          deliveryMethod: deliveryMethod || 'both',
          scheduledFor: scheduledFor || null
        },
        createdBy
      );

      res.json({
        success: true,
        data: result,
        message: 'Campaign created successfully'
      });
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to create campaign' }
      });
    }
  }

  // Get all campaigns with filters and pagination
  static async getCampaigns(req, res) {
    try {
      const { search, status, deliveryMethod, limit = 20, offset = 0 } = req.query;

      const result = await MarketingService.getCampaigns(
        search || null,
        status || null,
        deliveryMethod || null,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: result,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to fetch campaigns' }
      });
    }
  }

  // Get campaign by UUID
  static async getCampaignById(req, res) {
    try {
      const { uuid } = req.params;

      const result = await MarketingService.getCampaignById(uuid);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' }
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to fetch campaign' }
      });
    }
  }

  // Update campaign
  static async updateCampaign(req, res) {
    try {
      const { uuid } = req.params;
      const updateData = req.body;

      const result = await MarketingService.updateCampaign(uuid, updateData);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' }
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Campaign updated successfully'
      });
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to update campaign' }
      });
    }
  }

  // Send campaign to target audience
  static async sendCampaign(req, res) {
    try {
      const { uuid } = req.params;

      const result = await MarketingService.sendCampaign(uuid);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' }
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Campaign sent successfully'
      });
    } catch (error) {
      console.error('Send campaign error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to send campaign' }
      });
    }
  }

  // Delete (soft delete) campaign
  static async deleteCampaign(req, res) {
    try {
      const { uuid } = req.params;

      const result = await MarketingService.deleteCampaign(uuid);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found' }
        });
      }

      res.json({
        success: true,
        data: { uuid },
        message: 'Campaign deleted successfully'
      });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to delete campaign' }
      });
    }
  }

  // Get audiences with real user counts
  static async getAudiences(req, res) {
    try {
      const result = await MarketingService.getAudiences();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get audiences error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to fetch audiences' }
      });
    }
  }
}

module.exports = MarketingController;
