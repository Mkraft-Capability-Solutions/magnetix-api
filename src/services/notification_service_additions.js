// Universal Notification Methods - Add these to notification_service.js before the closing brace

  /**
   * Get user notifications with pagination and filters
   */
  async getUserNotifications(userId, limit, offset, type, isRead) {
    const connection = await promisePool.getConnection();
    try {
      const [results] = await connection.query(
        'CALL sp_get_user_notifications(?, ?, ?, ?, ?)',
        [userId, limit, offset, type, isRead]
      );
      return results[0] || [];
    } finally {
      connection.release();
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    const connection = await promisePool.getConnection();
    try {
      const [results] = await connection.query(
        'CALL sp_get_unread_count(?)',
        [userId]
      );
      return results[0]?.[0] || { unread_count: 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationUuid, userId) {
    const connection = await promisePool.getConnection();
    try {
      const [results] = await connection.query(
        'CALL sp_mark_notification_read(?, ?)',
        [notificationUuid, userId]
      );
      return results[0]?.[0] || { affected_rows: 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const connection = await promisePool.getConnection();
    try {
      const [results] = await connection.query(
        'CALL sp_mark_all_read(?)',
        [userId]
      );
      return results[0]?.[0] || { affected_rows: 0 };
    } finally {
      connection.release();
    }
  }

  /**
   * Create notification
   */
  async createNotification(notificationData) {
    const connection = await promisePool.getConnection();
    try {
      const query = `
        INSERT INTO notifications
        (uuid, title, message, notification_type, icon, recipient_id, delivery_method, campaign_id, metadata)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        notificationData.title,
        notificationData.message,
        notificationData.notification_type,
        notificationData.icon || 'bell',
        notificationData.recipient_id,
        notificationData.delivery_method || 'in-app',
        notificationData.campaign_id || null,
        notificationData.metadata || null
      ];
      const [results] = await connection.query(query, params);

      // Fetch and return the created notification
      const [fetchResults] = await connection.query(
        'SELECT * FROM notifications WHERE id = ?',
        [results.insertId]
      );
      return fetchResults[0] || {};
    } finally {
      connection.release();
    }
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(notifications) {
    const connection = await promisePool.getConnection();
    try {
      const query = `
        INSERT INTO notifications
        (uuid, title, message, notification_type, icon, recipient_id, delivery_method, campaign_id, metadata)
        VALUES ?
      `;
      const { v4: uuidv4 } = require('uuid');
      const values = notifications.map(n => [
        uuidv4(),
        n.title,
        n.message,
        n.notification_type,
        n.icon || 'bell',
        n.recipient_id,
        n.delivery_method || 'in-app',
        n.campaign_id || null,
        n.metadata || null
      ]);
      const [results] = await connection.query(query, [values]);
      return { affectedRows: results.affectedRows };
    } finally {
      connection.release();
    }
  }

  /**
   * Delete notification (soft delete)
   */
  async deleteNotification(notificationUuid, userId) {
    const connection = await promisePool.getConnection();
    try {
      const query = `
        UPDATE notifications
        SET is_deleted = 1, deleted_at = NOW()
        WHERE uuid = ? AND recipient_id = ? AND is_deleted = 0
      `;
      const [results] = await connection.query(query, [notificationUuid, userId]);
      return results.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification, recipientEmail, campaignId, notificationId) {
    const emailHelper = require('../utils/email_helper');
    const connection = await promisePool.getConnection();
    try {
      await emailHelper.sendEmail(
        recipientEmail,
        notification.title,
        'marketing-notification',
        {
          title: notification.title,
          message: notification.message,
          actionUrl: notification.action_url || null
        }
      );

      // Log to email_logs table
      const logQuery = `
        INSERT INTO email_logs (notification_id, campaign_id, recipient_email, status, sent_at)
        VALUES (?, ?, ?, 'sent', NOW())
      `;
      await connection.query(logQuery, [notificationId, campaignId, recipientEmail]);
    } catch (error) {
      console.error('Failed to send email:', error);
      // Log failure
      const logQuery = `
        INSERT INTO email_logs (notification_id, campaign_id, recipient_email, status, failed_at, error_message)
        VALUES (?, ?, ?, 'failed', NOW(), ?)
      `;
      await connection.query(logQuery, [notificationId, campaignId, recipientEmail, error.message]);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Create system notification
   */
  async createSystemNotification(userId, title, message, type, actionUrl, metadata) {
    return this.createNotification({
      title,
      message,
      notification_type: type,
      icon: this.getIconForType(type),
      recipient_id: userId,
      delivery_method: 'in-app',
      action_url: actionUrl,
      metadata: JSON.stringify(metadata)
    });
  }

  /**
   * Get icon for notification type
   */
  getIconForType(type) {
    const iconMap = {
      'marketing': 'megaphone',
      'system': 'settings',
      'announcement': 'bell',
      'instructor': 'users',
      'event': 'calendar',
      'course': 'book'
    };
    return iconMap[type] || 'bell';
  }
