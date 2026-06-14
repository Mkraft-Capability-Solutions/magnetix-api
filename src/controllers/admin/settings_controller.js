const settingsService = require('../../services/admin/settings_service');

/**
 * Admin Settings Controller
 * Handles all HTTP requests for admin settings endpoints
 */

/**
 * Get all settings
 * GET /api/admin/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;

    const settings = await settingsService.getAllSettings(category || null);

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Settings Controller - getSettings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

/**
 * Update multiple settings
 * PUT /api/admin/settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Settings object is required'
      });
    }

    const result = await settingsService.updateSettings(settings);

    res.json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    console.error('Settings Controller - updateSettings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

/**
 * Update a single setting
 * PUT /api/admin/settings/:key
 */
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Setting key is required'
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Setting value is required'
      });
    }

    const result = await settingsService.updateSetting(key, value);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Settings Controller - updateSetting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
      error: error.message
    });
  }
};

/**
 * Get storage statistics
 * GET /api/admin/settings/storage
 */
exports.getStorageStats = async (req, res) => {
  try {
    const stats = await settingsService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Settings Controller - getStorageStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch storage statistics',
      error: error.message
    });
  }
};

/**
 * Clear system cache
 * POST /api/admin/settings/clear-cache
 */
exports.clearCache = async (req, res) => {
  try {
    const result = await settingsService.clearCache();

    res.json({
      success: true,
      message: result.message,
      clearedAt: result.clearedAt
    });
  } catch (error) {
    console.error('Settings Controller - clearCache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
};
