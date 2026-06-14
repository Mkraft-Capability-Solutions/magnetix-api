const express = require('express');
const router = express.Router();
const reportSchedulerController = require('../../controllers/admin/report_scheduler_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

/**
 * GET /api/admin/reports/schedules
 * List all report schedules
 */
router.get('/', reportSchedulerController.getSchedules);

/**
 * POST /api/admin/reports/schedules
 * Create a new report schedule
 */
router.post('/', reportSchedulerController.createSchedule);

/**
 * POST /api/admin/reports/schedules/ai-parse
 * Parse a natural language command into schedule configuration using AI
 */
router.post('/ai-parse', reportSchedulerController.aiParseSchedule);

/**
 * PUT /api/admin/reports/schedules/:id
 * Update an existing schedule
 */
router.put('/:id', reportSchedulerController.updateSchedule);

/**
 * DELETE /api/admin/reports/schedules/:id
 * Delete a schedule
 */
router.delete('/:id', reportSchedulerController.deleteSchedule);

/**
 * PATCH /api/admin/reports/schedules/:id/toggle
 * Toggle schedule active/inactive
 */
router.patch('/:id/toggle', reportSchedulerController.toggleSchedule);

module.exports = router;
