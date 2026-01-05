const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth_middleware');
const notificationController = require('../controllers/notification_controller');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Universal Notification Routes - Accessible to all authenticated users
 */

// GET /api/notifications - Get user's notifications with pagination
router.get('/', notificationController.getUserNotifications.bind(notificationController));

// GET /api/notifications/count - Get unread notification count
router.get('/count', notificationController.getUnreadCount.bind(notificationController));

// PUT /api/notifications/:uuid/read - Mark single notification as read
router.put('/:uuid/read', notificationController.markAsRead.bind(notificationController));

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead.bind(notificationController));

// DELETE /api/notifications/:uuid - Delete notification
router.delete('/:uuid', notificationController.deleteNotification.bind(notificationController));

module.exports = router;
