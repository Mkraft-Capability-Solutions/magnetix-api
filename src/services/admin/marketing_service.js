const { pool: db } = require('../../config/db');
const NotificationService = require('../notification_service');
const { promisify } = require('util');

class MarketingService {
  // Create a new marketing campaign
  static async createCampaign(campaignData, createdBy) {
    return new Promise((resolve, reject) => {
      const query = `
        CALL sp_create_marketing_campaign(?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        campaignData.uuid,
        campaignData.title,
        campaignData.subject,
        campaignData.message,
        JSON.stringify(campaignData.targetAudience),
        campaignData.deliveryMethod,
        campaignData.scheduledFor,
        createdBy
      ];

      db.query(query, params, (error, results) => {
        if (error) {
          console.error('Create campaign error:', error);
          return reject(error);
        }

        // Results is an array of arrays - first array contains the result
        const campaign = results[0] ? results[0][0] : null;
        resolve(campaign);
      });
    });
  }

  // Get campaigns with filters
  static async getCampaigns(search, status, deliveryMethod, limit, offset) {
    return new Promise((resolve, reject) => {
      const query = `
        CALL sp_get_marketing_campaigns(?, ?, ?, ?, ?)
      `;

      const params = [search, status, deliveryMethod, limit, offset];

      db.query(query, params, (error, results) => {
        if (error) {
          console.error('Get campaigns error:', error);
          return reject(error);
        }

        const campaigns = results[0] || [];
        resolve(campaigns);
      });
    });
  }

  // Get campaign by UUID
  static async getCampaignById(uuid) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          mc.uuid,
          mc.id,
          mc.title,
          mc.subject,
          mc.message,
          mc.target_audience as targetAudience,
          mc.delivery_method as deliveryMethod,
          mc.status,
          mc.recipient_count as recipientCount,
          mc.total_sent as totalSent,
          mc.total_delivered as totalDelivered,
          mc.total_opened as totalOpened,
          mc.total_clicked as totalClicked,
          mc.scheduled_for as scheduledFor,
          mc.sent_at as sentAt,
          mc.created_at as createdAt,
          CONCAT(u.first_name, ' ', u.last_name) as createdByName
        FROM marketing_campaigns mc
        LEFT JOIN users u ON mc.created_by = u.uuid
        WHERE mc.uuid = ? AND mc.is_deleted = 0
      `;

      db.query(query, [uuid], (error, results) => {
        if (error) {
          console.error('Get campaign by ID error:', error);
          return reject(error);
        }

        const campaign = results && results.length > 0 ? results[0] : null;
        if (campaign && campaign.targetAudience) {
          campaign.targetAudience = typeof campaign.targetAudience === 'string'
            ? JSON.parse(campaign.targetAudience)
            : campaign.targetAudience;
        }
        resolve(campaign);
      });
    });
  }

  // Update campaign
  static async updateCampaign(uuid, updateData) {
    return new Promise((resolve, reject) => {
      const allowedFields = ['title', 'subject', 'message', 'targetAudience', 'deliveryMethod', 'scheduledFor'];
      const updates = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          const dbKey = key === 'targetAudience' ? 'target_audience'
                       : key === 'deliveryMethod' ? 'delivery_method'
                       : key === 'scheduledFor' ? 'scheduled_for' : key;

          updates.push(`${dbKey} = ?`);
          params.push(key === 'targetAudience' ? JSON.stringify(value) : value);
        }
      }

      if (updates.length === 0) {
        return resolve(null);
      }

      updates.push('updated_at = NOW()');
      params.push(uuid);

      const query = `
        UPDATE marketing_campaigns
        SET ${updates.join(', ')}
        WHERE uuid = ? AND is_deleted = 0
      `;

      db.query(query, params, (error) => {
        if (error) {
          console.error('Update campaign error:', error);
          return reject(error);
        }

        // Fetch and return updated campaign
        MarketingService.getCampaignById(uuid).then(resolve).catch(reject);
      });
    });
  }

  // Main method: Send campaign to target audience
  static async sendCampaign(campaignUuid) {
    try {
      // 1. Get campaign details
      const campaign = await this.getCampaignById(campaignUuid);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // 2. Resolve target audience to get user list
      const targetUsers = await this.resolveAudience(campaign.targetAudience);
      if (targetUsers.length === 0) {
        throw new Error('No users matched the target audience');
      }

      // 3. Update campaign status to 'sending'
      await this.updateCampaignStatus(campaignUuid, 'sending');

      // 4. Create notifications and send emails for each user
      let totalSent = 0;
      let totalDelivered = 0;
      let totalFailed = 0;

      for (const user of targetUsers) {
        try {
          // Create notification in database
          const notificationData = {
            title: campaign.title,
            message: campaign.message,
            notification_type: 'marketing',
            icon: 'megaphone',
            recipient_id: user.uuid,
            delivery_method: campaign.deliveryMethod,
            campaign_id: campaign.id,
            metadata: JSON.stringify({ campaignId: campaign.id, campaignUuid: campaign.uuid })
          };

          const notificationResult = await NotificationService.createNotification(notificationData);

          // Send email if delivery method includes email
          if (campaign.deliveryMethod === 'email' || campaign.deliveryMethod === 'both') {
            if (user.email) {
              await NotificationService.sendEmailNotification(
                {
                  uuid: notificationResult.uuid,
                  title: campaign.title,
                  message: campaign.message
                },
                user.email,
                campaign.id,
                notificationResult.id
              );
              totalDelivered++;
            } else {
              totalFailed++;
            }
          } else {
            totalDelivered++;
          }

          totalSent++;
        } catch (error) {
          console.error(`Failed to send to user ${user.uuid}:`, error);
          totalFailed++;
        }
      }

      // 5. Update campaign stats
      await this.updateCampaignStats(campaignUuid, totalSent, totalDelivered, totalFailed);

      // 6. Update campaign status to 'sent'
      await this.updateCampaignStatus(campaignUuid, 'sent');

      // 7. Return updated campaign
      return await this.getCampaignById(campaignUuid);
    } catch (error) {
      // Update status to failed if error
      try {
        await this.updateCampaignStatus(campaignUuid, 'failed');
      } catch (statusError) {
        console.error('Failed to update campaign status to failed:', statusError);
      }

      throw error;
    }
  }

  // Resolve audience filters to user list
  static async resolveAudience(targetAudience) {
    return new Promise((resolve, reject) => {
      const { roles = [], departments = [], specificUsers = [] } = targetAudience;

      let query = 'SELECT DISTINCT u.uuid, u.email, u.first_name, u.last_name FROM users u WHERE u.is_deleted = 0';
      const params = [];

      // Add role filters
      if (roles && roles.length > 0) {
        const placeholders = roles.map(() => '?').join(',');
        query += ` AND (u.role_id IN (${placeholders})`;
        params.push(...roles);
      }

      // Add department filters (if student_corporate_info exists)
      if (departments && departments.length > 0) {
        const placeholders = departments.map(() => '?').join(',');
        if (roles && roles.length > 0) {
          query += ` OR sci.department IN (${placeholders})`;
        } else {
          query += ` AND sci.department IN (${placeholders})`;
        }
        params.push(...departments);

        // Add join for corporate info
        query = query.replace('FROM users u', 'FROM users u LEFT JOIN student_corporate_info sci ON u.uuid = sci.student_uuid');
      }

      // Add specific users
      if (specificUsers && specificUsers.length > 0) {
        const placeholders = specificUsers.map(() => '?').join(',');
        if (roles && roles.length > 0) {
          query += ` OR u.uuid IN (${placeholders})`;
        } else {
          query += ` AND u.uuid IN (${placeholders})`;
        }
        params.push(...specificUsers);
      }

      // Close WHERE clause if needed
      if ((roles && roles.length > 0) || (specificUsers && specificUsers.length > 0)) {
        query += ')';
      }

      db.query(query, params, (error, results) => {
        if (error) {
          console.error('Resolve audience error:', error);
          return reject(error);
        }

        resolve(results || []);
      });
    });
  }

  // Update campaign status
  static async updateCampaignStatus(campaignUuid, status) {
    return new Promise((resolve, reject) => {
      const sentAtClause = (status === 'sent' || status === 'failed') ? ', sent_at = NOW()' : '';

      const query = `
        UPDATE marketing_campaigns
        SET status = ?${sentAtClause}, updated_at = NOW()
        WHERE uuid = ?
      `;

      db.query(query, [status, campaignUuid], (error) => {
        if (error) {
          console.error('Update campaign status error:', error);
          return reject(error);
        }

        resolve();
      });
    });
  }

  // Update campaign statistics
  static async updateCampaignStats(campaignUuid, totalSent, totalDelivered, totalFailed) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE marketing_campaigns
        SET total_sent = ?, total_delivered = ?, total_failed = ?, updated_at = NOW()
        WHERE uuid = ?
      `;

      db.query(query, [totalSent, totalDelivered, totalFailed, campaignUuid], (error) => {
        if (error) {
          console.error('Update campaign stats error:', error);
          return reject(error);
        }

        resolve();
      });
    });
  }

  // Delete (soft delete) campaign
  static async deleteCampaign(uuid) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE marketing_campaigns
        SET is_deleted = 1, updated_at = NOW()
        WHERE uuid = ? AND is_deleted = 0
      `;

      db.query(query, [uuid], (error, results) => {
        if (error) {
          console.error('Delete campaign error:', error);
          return reject(error);
        }

        if (results && results.affectedRows > 0) {
          resolve({ uuid });
        } else {
          resolve(null);
        }
      });
    });
  }
}

module.exports = MarketingService;
