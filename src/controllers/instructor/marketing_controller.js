const MarketingService = require('../../services/instructor/marketing_service');
const { v4: uuidv4 } = require('uuid');

class InstructorMarketingController {
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

      // Instructors can only target students - validate targetAudience
      if (targetAudience.roles && targetAudience.roles.length > 0) {
        const invalidRoles = targetAudience.roles.filter(role => role !== 1);
        if (invalidRoles.length > 0) {
          return res.status(403).json({
            success: false,
            error: { message: 'Instructors can only create campaigns for students' }
          });
        }
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
      console.error('Instructor - Create campaign error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to create campaign' }
      });
    }
  }

  // Get all campaigns created by instructor
  static async getCampaigns(req, res) {
    try {
      const instructorId = req.user.uuid;
      const { search, status, deliveryMethod, limit = 20, offset = 0 } = req.query;

      const result = await MarketingService.getCampaigns(
        instructorId,
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
      console.error('Instructor - Get campaigns error:', error);
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
      const instructorId = req.user.uuid;

      const result = await MarketingService.getCampaignById(uuid, instructorId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found or access denied' }
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Instructor - Get campaign error:', error);
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
      const instructorId = req.user.uuid;

      // Validate role targeting if provided
      if (updateData.targetAudience && updateData.targetAudience.roles) {
        const invalidRoles = updateData.targetAudience.roles.filter(role => role !== 1);
        if (invalidRoles.length > 0) {
          return res.status(403).json({
            success: false,
            error: { message: 'Instructors can only create campaigns for students' }
          });
        }
      }

      const result = await MarketingService.updateCampaign(uuid, updateData, instructorId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found or access denied' }
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Campaign updated successfully'
      });
    } catch (error) {
      console.error('Instructor - Update campaign error:', error);
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
      const instructorId = req.user.uuid;

      const result = await MarketingService.sendCampaign(uuid, instructorId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found or access denied' }
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Campaign sent successfully'
      });
    } catch (error) {
      console.error('Instructor - Send campaign error:', error);
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
      const instructorId = req.user.uuid;

      const result = await MarketingService.deleteCampaign(uuid, instructorId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { message: 'Campaign not found or access denied' }
        });
      }

      res.json({
        success: true,
        data: { uuid },
        message: 'Campaign deleted successfully'
      });
    } catch (error) {
      console.error('Instructor - Delete campaign error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to delete campaign' }
      });
    }
  }
}

module.exports = InstructorMarketingController;
