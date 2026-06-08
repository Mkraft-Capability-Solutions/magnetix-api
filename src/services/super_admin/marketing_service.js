const { pool: db } = require('../../config/db');
const NotificationService = require('../notification_service');
const { promisify } = require('util');

/**
 * Replace personalization tokens ({{firstName}}, {{lastName}}, {{fullName}},
 * {{email}}) in a string with the recipient's values. Tokens are matched
 * case-insensitively with optional surrounding spaces; unknown tokens are left
 * untouched so unrelated braces aren't mangled.
 */
function personalize(text, user) {
  if (!text) return text;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const vars = {
    firstname: user.first_name || '',
    lastname: user.last_name || '',
    fullname: fullName,
    name: fullName || user.first_name || '',
    email: user.email || '',
    coursename: '' // no course context in a marketing campaign
  };
  return String(text).replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, key) => {
    const k = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : match;
  });
}

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
          TRIM(CONCAT(
            COALESCE(s.first_name, i.first_name, a.first_name, ''), ' ',
            COALESCE(s.last_name, i.last_name, a.last_name, '')
          )) as createdByName
        FROM marketing_campaigns mc
        LEFT JOIN students s ON mc.created_by = s.user_id
        LEFT JOIN instructors i ON mc.created_by = i.user_id
        LEFT JOIN admins a ON mc.created_by = a.user_id
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
          // Substitute personalization tokens for this recipient.
          const personalizedTitle = personalize(campaign.title, user);
          const personalizedMessage = personalize(campaign.message, user);

          // Create notification in database
          const notificationData = {
            title: personalizedTitle,
            message: personalizedMessage,
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
                  title: personalizedTitle,
                  message: personalizedMessage
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

  // Resolve audience filters (roles, specific uuids, specific emails) to a user list.
  static async resolveAudience(targetAudience) {
    return new Promise((resolve, reject) => {
      const { roles = [], specificUsers = [], specificEmails = [] } = targetAudience || {};

      // Build an OR group across the provided selectors so a user matching ANY
      // selector is included.
      const orConditions = [];
      const params = [];

      if (roles && roles.length > 0) {
        orConditions.push(`u.role_id IN (${roles.map(() => '?').join(',')})`);
        params.push(...roles);
      }
      if (specificUsers && specificUsers.length > 0) {
        orConditions.push(`u.uuid IN (${specificUsers.map(() => '?').join(',')})`);
        params.push(...specificUsers);
      }
      if (specificEmails && specificEmails.length > 0) {
        orConditions.push(`LOWER(u.email) IN (${specificEmails.map(() => '?').join(',')})`);
        params.push(...specificEmails.map(e => String(e).toLowerCase()));
      }

      // uuid + email drive the notification/email; first_name/last_name power
      // personalization tokens ({{firstName}} etc.). Names live in the
      // role-specific tables (NOT on `users`), so COALESCE across them.
      let query =
        `SELECT DISTINCT u.uuid, u.email,
                COALESCE(s.first_name, i.first_name, a.first_name) AS first_name,
                COALESCE(s.last_name,  i.last_name,  a.last_name)  AS last_name
           FROM users u
           LEFT JOIN students s    ON u.uuid = s.user_id
           LEFT JOIN instructors i ON u.uuid = i.user_id
           LEFT JOIN admins a      ON u.uuid = a.user_id
          WHERE u.is_deleted = 0`;
      if (orConditions.length > 0) {
        query += ` AND (${orConditions.join(' OR ')})`;
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

  // List individual users (uuid, name, email, roleId) for the audience picker.
  // Names live in the role-specific tables, so COALESCE across them.
  static async getUsersByRole() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          u.uuid,
          u.email,
          u.role_id AS roleId,
          TRIM(CONCAT(
            COALESCE(s.first_name, i.first_name, a.first_name, ''), ' ',
            COALESCE(s.last_name, i.last_name, a.last_name, '')
          )) AS name
        FROM users u
        LEFT JOIN students s ON u.uuid = s.user_id
        LEFT JOIN instructors i ON u.uuid = i.user_id
        LEFT JOIN admins a ON u.uuid = a.user_id
        WHERE u.is_deleted = 0 AND u.role_id IN (1, 2, 3)
        ORDER BY name
      `;
      db.query(query, [], (error, results) => {
        if (error) {
          console.error('Get users by role error:', error);
          return reject(error);
        }
        resolve(results || []);
      });
    });
  }

  // Validate a list of emails against existing (non-deleted) user accounts.
  static async validateEmails(emails) {
    return new Promise((resolve, reject) => {
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return resolve({ validEmails: [], invalidEmails: [] });
      }

      const uniqueEmails = [...new Set(emails.map(email => email.trim().toLowerCase()))];
      const placeholders = uniqueEmails.map(() => '?').join(',');
      const query = `
        SELECT LOWER(email) as email
        FROM users
        WHERE LOWER(email) IN (${placeholders})
          AND is_deleted = 0
      `;

      db.query(query, uniqueEmails, (error, results) => {
        if (error) {
          console.error('Validate emails error:', error);
          return reject(error);
        }

        const validEmailsSet = new Set(results.map(row => row.email));
        const validEmails = uniqueEmails.filter(email => validEmailsSet.has(email));
        const invalidEmails = uniqueEmails.filter(email => !validEmailsSet.has(email));
        resolve({ validEmails, invalidEmails });
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
