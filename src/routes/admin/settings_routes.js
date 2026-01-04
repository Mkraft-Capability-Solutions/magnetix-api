const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/admin/settings_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(3)); // Role 3 = Admin

/**
 * GET /api/admin/settings
 * Get all settings (optionally filtered by category)
 * Query params: category (optional)
 */
router.get('/', settingsController.getSettings);

/**
 * PUT /api/admin/settings
 * Update multiple settings at once
 * Body: { general: {...}, security: {...}, ... }
 */
router.put('/', settingsController.updateSettings);

/**
 * PUT /api/admin/settings/:key
 * Update a single setting by key
 * Body: { value: ... }
 */
router.put('/:key', settingsController.updateSetting);

/**
 * GET /api/admin/settings/storage
 * Get storage statistics
 */
router.get('/storage', settingsController.getStorageStats);

/**
 * POST /api/admin/settings/clear-cache
 * Clear system cache
 */
router.post('/clear-cache', settingsController.clearCache);

module.exports = router;
