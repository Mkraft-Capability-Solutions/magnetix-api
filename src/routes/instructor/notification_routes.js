const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notification_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and instructor role (role_id = 2)
router.use(authenticate);
router.use(authorize(2));

/**
 * @route GET /api/instructor/notifications
 * @description Get paginated notifications for instructor
 * @access Private (Instructor only)
 * @query {number} limit - Number of notifications to retrieve (default: 20, max: 100)
 * @query {number} offset - Offset for pagination (default: 0)
 * @query {number} page - Page number (alternative to offset)
 */
router.get('/', notificationController.getInstructorNotifications);

/**
 * @route GET /api/instructor/notifications/counts
 * @description Get notification counts by type and status
 * @access Private (Instructor only)
 */
router.get('/counts', notificationController.getNotificationCounts);

/**
 * @route GET /api/instructor/notifications/summary
 * @description Get notifications summary for dashboard (recent notifications + counts)
 * @access Private (Instructor only)
 */
router.get('/summary', notificationController.getNotificationsSummary);

/**
 * @route GET /api/instructor/notifications/type/:type
 * @description Get notifications by specific type
 * @access Private (Instructor only)
 * @param {string} type - Notification type (session_request, mentorship_request, course_enrollment, event_participation, course_verification)
 * @query {number} limit - Number of notifications to retrieve (default: 20, max: 100)
 * @query {number} offset - Offset for pagination (default: 0)
 * @query {number} page - Page number (alternative to offset)
 */
router.get('/type/:type', notificationController.getNotificationsByType);

/**
 * @route POST /api/instructor/notifications/mark-read
 * @description Mark specific notifications as read
 * @access Private (Instructor only)
 * @body {string[]} notification_ids - Array of notification IDs to mark as read
 */
router.post('/mark-read', notificationController.markNotificationsAsRead);

module.exports = router;