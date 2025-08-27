const notificationService = require('../services/notification_service');
const Joi = require('joi');

/**
 * Validation schemas
 */
const getNotificationsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  page: Joi.number().integer().min(1)
});

const markAsReadSchema = Joi.object({
  notification_ids: Joi.array().items(Joi.string().required()).min(1).required()
});

class NotificationController {

  /**
   * Get notifications for instructor
   * GET /api/instructor/notifications
   */
  async getInstructorNotifications(req, res, next) {
    try {
      // Get instructor UUID from authenticated user
      const instructorUuid = req.user?.uuid;
      
      if (!instructorUuid) {
        return res.status(401).json({
          success: false,
          message: 'Instructor authentication required'
        });
      }

      // Validate query parameters
      const { error, value } = getNotificationsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          details: error.details[0].message
        });
      }

      let { limit, offset, page } = value;

      // If page is provided, calculate offset
      if (page) {
        offset = (page - 1) * limit;
      }

      // Get notifications from service
      const result = await notificationService.getInstructorNotifications(
        instructorUuid, 
        limit, 
        offset
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in getInstructorNotifications:', error);
      next(error);
    }
  }

  /**
   * Get notification counts for instructor
   * GET /api/instructor/notifications/counts
   */
  async getNotificationCounts(req, res, next) {
    try {
      // Get instructor UUID from authenticated user
      const instructorUuid = req.user?.uuid;
      
      if (!instructorUuid) {
        return res.status(401).json({
          success: false,
          message: 'Instructor authentication required'
        });
      }

      // Get notification counts from service
      const result = await notificationService.getNotificationCounts(instructorUuid);

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in getNotificationCounts:', error);
      next(error);
    }
  }

  /**
   * Mark notifications as read
   * POST /api/instructor/notifications/mark-read
   */
  async markNotificationsAsRead(req, res, next) {
    try {
      // Get instructor UUID from authenticated user
      const instructorUuid = req.user?.uuid;
      
      if (!instructorUuid) {
        return res.status(401).json({
          success: false,
          message: 'Instructor authentication required'
        });
      }

      // Validate request body
      const { error, value } = markAsReadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          details: error.details[0].message
        });
      }

      const { notification_ids } = value;

      // Mark notifications as read
      const result = await notificationService.markNotificationsAsRead(
        instructorUuid, 
        notification_ids
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in markNotificationsAsRead:', error);
      next(error);
    }
  }

  /**
   * Get notifications summary for dashboard
   * GET /api/instructor/notifications/summary
   */
  async getNotificationsSummary(req, res, next) {
    try {
      // Get instructor UUID from authenticated user
      const instructorUuid = req.user?.uuid;
      
      if (!instructorUuid) {
        return res.status(401).json({
          success: false,
          message: 'Instructor authentication required'
        });
      }

      // Get recent notifications (last 10) and counts
      const [notifications, counts] = await Promise.all([
        notificationService.getInstructorNotifications(instructorUuid, 10, 0),
        notificationService.getNotificationCounts(instructorUuid)
      ]);

      res.status(200).json({
        success: true,
        data: {
          recent_notifications: notifications.data.notifications,
          summary: notifications.data.summary,
          counts: counts.data,
          total_recent: notifications.data.notifications.length
        }
      });

    } catch (error) {
      console.error('Error in getNotificationsSummary:', error);
      next(error);
    }
  }

  /**
   * Get notifications by type
   * GET /api/instructor/notifications/type/:type
   */
  async getNotificationsByType(req, res, next) {
    try {
      // Get instructor UUID from authenticated user
      const instructorUuid = req.user?.uuid;
      
      if (!instructorUuid) {
        return res.status(401).json({
          success: false,
          message: 'Instructor authentication required'
        });
      }

      const { type } = req.params;
      const validTypes = ['session_request', 'mentorship_request', 'course_enrollment', 'event_participation', 'course_verification'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type',
          valid_types: validTypes
        });
      }

      // Validate query parameters
      const { error, value } = getNotificationsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          details: error.details[0].message
        });
      }

      let { limit, offset, page } = value;

      // If page is provided, calculate offset
      if (page) {
        offset = (page - 1) * limit;
      }

      // Get all notifications and filter by type
      const result = await notificationService.getInstructorNotifications(
        instructorUuid, 
        100, // Get more to filter
        0
      );

      // Filter by requested type
      const filteredNotifications = result.data.notifications.filter(
        notification => notification.type === type
      );

      // Apply pagination to filtered results
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        data: {
          notifications: paginatedNotifications,
          type: type,
          pagination: {
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(filteredNotifications.length / limit),
            totalItems: filteredNotifications.length,
            itemsPerPage: limit
          }
        }
      });

    } catch (error) {
      console.error('Error in getNotificationsByType:', error);
      next(error);
    }
  }
}

module.exports = new NotificationController();