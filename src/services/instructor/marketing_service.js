const { pool: db } = require('../../config/db');
const NotificationService = require('../notification_service');
const { promisify } = require('util');

class InstructorMarketingService {
  // Create a new marketing campaign (instructor can only target students)
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
          console.error('Instructor - Create campaign error:', error);
          return reject(error);
        }

        // Results is an array of arrays - first array contains the result
        const campaign = results[0] ? results[0][0] : null;
        resolve(campaign);
      });
    });
  }

  // Get campaigns created by instructor
  static async getCampaigns(instructorId, search, status, deliveryMethod, limit, offset) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          mc.uuid,
          mc.id,
          mc.title,
          mc.subject,
          mc.delivery_method as deliveryMethod,
          mc.status,
          mc.recipient_count as recipientCount,
          mc.total_sent as totalSent,
          mc.total_delivered as totalDelivered,
          mc.total_opened as totalOpened,
          mc.total_clicked as totalClicked,
          mc.scheduled_for as scheduledFor,
          mc.sent_at as sentAt,
          mc.created_at as createdAt
        FROM marketing_campaigns mc
        WHERE mc.created_by = ? AND mc.is_deleted = 0
          ${search ? 'AND (mc.title LIKE ? OR mc.subject LIKE ?)' : ''}
          ${status ? 'AND mc.status = ?' : ''}
          ${deliveryMethod ? 'AND mc.delivery_method = ?' : ''}
        ORDER BY mc.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const params = [instructorId];
      if (search) {
        params.push(`%${search}%`, `%${search}%`);
      }
      if (status) {
        params.push(status);
      }
      if (deliveryMethod) {
        params.push(deliveryMethod);
      }
      params.push(parseInt(limit), parseInt(offset));

      db.query(query, params, (error, results) => {
        if (error) {
          console.error('Instructor - Get campaigns error:', error);
          return reject(error);
        }

        const campaigns = results || [];
        resolve(campaigns);
      });
    });
  }

  // Get campaign by UUID (only if created by instructor)
  static async getCampaignById(uuid, instructorId) {
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
          CONCAT(i.first_name, ' ', i.last_name) as createdByName
        FROM marketing_campaigns mc
        LEFT JOIN instructors i ON mc.created_by = i.user_id
        WHERE mc.uuid = ? AND mc.created_by = ? AND mc.is_deleted = 0
      `;

      db.query(query, [uuid, instructorId], (error, results) => {
        if (error) {
          console.error('Instructor - Get campaign by ID error:', error);
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

  // Update campaign (only if created by instructor and not yet sent)
  static async updateCampaign(uuid, updateData, instructorId) {
    return new Promise(async (resolve, reject) => {
      try {
        // First verify campaign belongs to instructor and is not sent
        const campaign = await InstructorMarketingService.getCampaignById(uuid, instructorId);
        if (!campaign) {
          return resolve(null);
        }

        if (campaign.status === 'sent' || campaign.status === 'sending') {
          return reject(new Error('Cannot update campaign that has been sent'));
        }

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
        params.push(uuid, instructorId);

        const query = `
          UPDATE marketing_campaigns
          SET ${updates.join(', ')}
          WHERE uuid = ? AND created_by = ? AND is_deleted = 0
        `;

        db.query(query, params, (error) => {
          if (error) {
            console.error('Instructor - Update campaign error:', error);
            return reject(error);
          }

          // Fetch and return updated campaign
          InstructorMarketingService.getCampaignById(uuid, instructorId).then(resolve).catch(reject);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Send campaign to target audience (students only)
  static async sendCampaign(campaignUuid, instructorId) {
    try {
      // 1. Get campaign details
      const campaign = await this.getCampaignById(campaignUuid, instructorId);
      if (!campaign) {
        throw new Error('Campaign not found or access denied');
      }

      // 2. Resolve target audience to get student list only
      const targetUsers = await this.resolveAudience(campaign.targetAudience, instructorId);
      if (targetUsers.length === 0) {
        throw new Error('No students matched the target audience');
      }

      // 3. Update campaign status to 'sending'
      await this.updateCampaignStatus(campaignUuid, 'sending', instructorId);

      // 4. Create notifications and send emails for each student
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
      await this.updateCampaignStats(campaignUuid, totalSent, totalDelivered, totalFailed, instructorId);

      // 6. Update campaign status to 'sent'
      await this.updateCampaignStatus(campaignUuid, 'sent', instructorId);

      // 7. Return updated campaign
      return await this.getCampaignById(campaignUuid, instructorId);
    } catch (error) {
      // Update status to failed if error
      try {
        await this.updateCampaignStatus(campaignUuid, 'failed', instructorId);
      } catch (statusError) {
        console.error('Failed to update campaign status to failed:', statusError);
      }

      throw error;
    }
  }

  // Resolve audience filters to student list only
  static async resolveAudience(targetAudience, instructorId) {
    return new Promise((resolve, reject) => {
      const { departments = [], specificUsers = [] } = targetAudience;

      // Instructors can only target students (role_id = 1)
      let query = `
        SELECT DISTINCT u.uuid, u.email, s.first_name, s.last_name
        FROM users u
        INNER JOIN students s ON u.uuid = s.user_id
        WHERE u.is_deleted = 0 AND u.role_id = 1
      `;
      const params = [];

      // Add department filters
      if (departments && departments.length > 0) {
        const placeholders = departments.map(() => '?').join(',');
        query += ` AND (sci.department IN (${placeholders})`;
        params.push(...departments);

        // Add join for corporate info
        query = query.replace('FROM users u', 'FROM users u LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id');
      }

      // Add specific users (verify they are students)
      if (specificUsers && specificUsers.length > 0) {
        const placeholders = specificUsers.map(() => '?').join(',');
        if (departments && departments.length > 0) {
          query += ` OR u.uuid IN (${placeholders})`;
        } else {
          query += ` AND u.uuid IN (${placeholders})`;
        }
        params.push(...specificUsers);
      }

      // Close WHERE clause if needed
      if (departments && departments.length > 0) {
        query += ')';
      }

      db.query(query, params, (error, results) => {
        if (error) {
          console.error('Instructor - Resolve audience error:', error);
          return reject(error);
        }

        resolve(results || []);
      });
    });
  }

  // Update campaign status (with instructor verification)
  static async updateCampaignStatus(campaignUuid, status, instructorId) {
    return new Promise((resolve, reject) => {
      const sentAtClause = (status === 'sent' || status === 'failed') ? ', sent_at = NOW()' : '';

      const query = `
        UPDATE marketing_campaigns
        SET status = ?${sentAtClause}, updated_at = NOW()
        WHERE uuid = ? AND created_by = ?
      `;

      db.query(query, [status, campaignUuid, instructorId], (error) => {
        if (error) {
          console.error('Instructor - Update campaign status error:', error);
          return reject(error);
        }

        resolve();
      });
    });
  }

  // Update campaign statistics (with instructor verification)
  static async updateCampaignStats(campaignUuid, totalSent, totalDelivered, totalFailed, instructorId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE marketing_campaigns
        SET total_sent = ?, total_delivered = ?, total_failed = ?, updated_at = NOW()
        WHERE uuid = ? AND created_by = ?
      `;

      db.query(query, [totalSent, totalDelivered, totalFailed, campaignUuid, instructorId], (error) => {
        if (error) {
          console.error('Instructor - Update campaign stats error:', error);
          return reject(error);
        }

        resolve();
      });
    });
  }

  // Delete (soft delete) campaign (only if created by instructor)
  static async deleteCampaign(uuid, instructorId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE marketing_campaigns
        SET is_deleted = 1, updated_at = NOW()
        WHERE uuid = ? AND created_by = ? AND is_deleted = 0
      `;

      db.query(query, [uuid, instructorId], (error, results) => {
        if (error) {
          console.error('Instructor - Delete campaign error:', error);
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

module.exports = InstructorMarketingService;
