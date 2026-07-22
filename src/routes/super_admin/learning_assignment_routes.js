const express = require('express');
const router = express.Router();
const controller = require('../../controllers/super_admin/learning_assignment_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All learning-assignment routes are Super Admin only.
router.use(authenticate);
router.use(authorize(4)); // Role 4 = Super Admin

/**
 * POST /api/super-admin/learning-assignments
 * Body: { title, description?, dueDate?, notifyUsers?, notificationMethod?,
 *         enableReminders?, reminderTiming?, userIds: string[], courseIds: number[] }
 */
router.post('/', controller.createAssignment);

/**
 * GET /api/super-admin/learning-assignments
 * List all assignments with completion stats.
 */
router.get('/', controller.listAssignments);

/**
 * GET /api/super-admin/learning-assignments/:id
 * Assignment detail + per-user progress.
 */
router.get('/:id', controller.getAssignmentDetail);

module.exports = router;
