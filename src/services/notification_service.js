const { promisePool } = require('../config/db');

class NotificationService {

  /**
   * Get notifications for instructor
   * @param {string} instructorUuid - UUID of the instructor
   * @param {number} limit - Number of notifications to retrieve (default: 20)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Object} - Notifications data with pagination info
   */
  async getInstructorNotifications(instructorUuid, limit = 20, offset = 0) {
    const connection = await promisePool.getConnection();
    
    try {
      // Call the stored procedure
      const [results] = await connection.query(
        'CALL get_notifications_for_instructor(?, ?, ?)',
        [instructorUuid, limit, offset]
      );

      // The stored procedure now returns a single result set
      const notifications = results[0] || [];

      // Transform the data to match expected format
      const transformedNotifications = notifications.map(notification => ({
        id: notification.notification_id,
        type: notification.notification_type,
        title: notification.title,
        description: notification.description,
        related_id: notification.related_id,
        related_name: notification.related_name,
        user_name: notification.user_name,
        user_email: notification.user_email,
        notification_date: notification.notification_date,
        status: notification.status,
        priority: notification.priority,
        action_type: notification.action_type,
        category: notification.category,
        // Calculate relative time
        relative_time: this.getRelativeTime(notification.notification_date)
      }));

      // Get total count for the same instructor (without pagination)
      const [countResults] = await connection.query(
        `SELECT COUNT(*) as total_count FROM (
          SELECT ss.id FROM scheduled_sessions ss 
          WHERE ss.mentor_id = ? AND ss.created_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          UNION ALL
          SELECT m.id FROM mentorship m 
          WHERE m.mentorId = ? AND m.mentorship_deleted = 0 AND m.datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          UNION ALL
          SELECT e.id FROM enrol e JOIN course c ON e.course_id = c.id 
          WHERE c.creator_id = ? AND e.enrolled_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          UNION ALL
          SELECT ea.id FROM event_attendees ea JOIN events ev ON ea.event_id = ev.id 
          WHERE ev.creator_id = ? AND ev.is_deleted = 0 AND ea.registered_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          UNION ALL
          SELECT c.id FROM course c 
          WHERE c.creator_id = ? AND c.is_deleted = 0 AND c.last_updated >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND c.status IN ('pending', 'active', 'inactive')
        ) as combined`,
        [instructorUuid, instructorUuid, instructorUuid, instructorUuid, instructorUuid]
      );

      const totalCount = countResults[0]?.total_count || 0;

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = Math.floor(offset / limit) + 1;
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;

      // Group notifications by type for better organization
      const groupedNotifications = this.groupNotificationsByType(transformedNotifications);

      // Get summary counts by type and status
      const summary = this.getNotificationSummary(transformedNotifications);

      return {
        success: true,
        data: {
          notifications: transformedNotifications,
          groupedNotifications,
          summary,
          pagination: {
            currentPage,
            totalPages,
            totalItems: totalCount,
            itemsPerPage: limit,
            hasNextPage,
            hasPreviousPage,
            nextPage: hasNextPage ? currentPage + 1 : null,
            previousPage: hasPreviousPage ? currentPage - 1 : null
          }
        }
      };

    } catch (error) {
      console.error('Error in getInstructorNotifications service:', error);
      throw new Error(`Failed to get instructor notifications: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Group notifications by type
   * @param {Array} notifications - Array of notifications
   * @returns {Object} - Grouped notifications
   */
  groupNotificationsByType(notifications) {
    const grouped = {
      session_requests: [],
      mentorship_requests: [],
      course_enrollments: [],
      event_participations: [],
      course_verifications: []
    };

    notifications.forEach(notification => {
      switch (notification.type) {
        case 'session_request':
          grouped.session_requests.push(notification);
          break;
        case 'mentorship_request':
          grouped.mentorship_requests.push(notification);
          break;
        case 'course_enrollment':
          grouped.course_enrollments.push(notification);
          break;
        case 'event_participation':
          grouped.event_participations.push(notification);
          break;
        case 'course_verification':
          grouped.course_verifications.push(notification);
          break;
      }
    });

    return grouped;
  }

  /**
   * Get notification summary with counts
   * @param {Array} notifications - Array of notifications
   * @returns {Object} - Summary with counts
   */
  getNotificationSummary(notifications) {
    const summary = {
      total: notifications.length,
      byType: {
        session_requests: 0,
        mentorship_requests: 0,
        course_enrollments: 0,
        event_participations: 0,
        course_verifications: 0
      },
      byStatus: {
        pending: 0,
        active: 0,
        completed: 0,
        rejected: 0
      },
      byPriority: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    notifications.forEach(notification => {
      // Count by type
      if (summary.byType.hasOwnProperty(notification.type)) {
        summary.byType[notification.type]++;
      }

      // Count by status
      const status = notification.status?.toLowerCase();
      if (summary.byStatus.hasOwnProperty(status)) {
        summary.byStatus[status]++;
      }

      // Count by priority
      const priority = notification.priority;
      if (priority === 1) {
        summary.byPriority.high++;
      } else if (priority === 2) {
        summary.byPriority.medium++;
      } else {
        summary.byPriority.low++;
      }
    });

    return summary;
  }

  /**
   * Get notification counts by type for instructor
   * @param {string} instructorUuid - UUID of the instructor
   * @returns {Object} - Notification counts
   */
  async getNotificationCounts(instructorUuid) {
    const connection = await promisePool.getConnection();
    
    try {
      // Get counts for different notification types
      const [sessionCounts] = await connection.query(
        `SELECT COUNT(*) as count FROM scheduled_sessions 
         WHERE mentor_id = ? AND status = 'pending' 
         AND created_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [instructorUuid]
      );

      const [mentorshipCounts] = await connection.query(
        `SELECT COUNT(*) as count FROM mentorship 
         WHERE mentorId = ? AND status = 0 AND mentorship_deleted = 0
         AND datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [instructorUuid]
      );

      const [enrollmentCounts] = await connection.query(
        `SELECT COUNT(*) as count FROM enrol e
         JOIN course c ON e.course_id = c.id
         WHERE c.creator_id = ? 
         AND e.enrolled_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [instructorUuid]
      );

      const [eventCounts] = await connection.query(
        `SELECT COUNT(*) as count FROM event_attendees ea
         JOIN events ev ON ea.event_id = ev.id
         WHERE ev.creator_id = ? AND ev.is_deleted = 0
         AND ea.registered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [instructorUuid]
      );

      const [courseCounts] = await connection.query(
        `SELECT COUNT(*) as count FROM course 
         WHERE creator_id = ? AND status = 'pending' AND is_deleted = 0`,
        [instructorUuid]
      );

      return {
        success: true,
        data: {
          pending_sessions: sessionCounts[0].count,
          pending_mentorships: mentorshipCounts[0].count,
          recent_enrollments: enrollmentCounts[0].count,
          recent_event_registrations: eventCounts[0].count,
          pending_course_verifications: courseCounts[0].count,
          total_pending: sessionCounts[0].count + mentorshipCounts[0].count + courseCounts[0].count
        }
      };

    } catch (error) {
      throw new Error(`Failed to get notification counts: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Mark notifications as read (if we implement read/unread functionality later)
   * @param {string} instructorUuid - UUID of the instructor
   * @param {Array} notificationIds - Array of notification IDs to mark as read
   * @returns {Object} - Success response
   */
  async markNotificationsAsRead(instructorUuid, notificationIds) {
    // This would require a separate notifications table to track read/unread status
    // For now, returning success response
    return {
      success: true,
      message: 'Notifications marked as read',
      data: {
        marked_count: notificationIds.length
      }
    };
  }

  /**
   * Calculate relative time from notification date
   * @param {Date} notificationDate - The notification date
   * @returns {string} - Relative time string
   */
  getRelativeTime(notificationDate) {
    if (!notificationDate) return 'Unknown time';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - new Date(notificationDate)) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    // For older dates, return formatted date
    return new Date(notificationDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
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
}

module.exports = new NotificationService();
