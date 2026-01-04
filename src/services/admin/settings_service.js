const { promisePool: pool } = require('../../config/db');

/**
 * Admin Settings Service
 * Handles all business logic for admin settings operations
 */

/**
 * Get all settings grouped by category
 * @param {string} category - Optional category filter
 * @returns {Promise<Object>} Settings grouped by category
 */
const getAllSettings = async (category = null) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_get_admin_settings(?)',
      [category]
    );

    const settings = rows[0] || [];

    // Group settings by category
    const grouped = {
      general: {},
      security: {},
      users: {},
      email: {},
      notifications: {},
      branding: {}
    };

    settings.forEach(setting => {
      const key = toCamelCase(setting.setting_key);
      let value = setting.setting_value;

      // Convert value based on type
      if (setting.setting_type === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (setting.setting_type === 'number') {
        value = parseInt(value, 10) || 0;
      } else if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = {};
        }
      }

      if (grouped[setting.category]) {
        grouped[setting.category][key] = value;
      }
    });

    return grouped;
  } catch (error) {
    console.error('Settings Service - getAllSettings error:', error);
    throw error;
  }
};

/**
 * Update multiple settings
 * @param {Object} settings - Settings object grouped by category
 * @returns {Promise<Object>} Result with success status
 */
const updateSettings = async (settings) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const updates = [];

    // Flatten settings object to key-value pairs
    for (const category in settings) {
      const categorySettings = settings[category];
      for (const key in categorySettings) {
        const dbKey = toSnakeCase(key);
        let value = categorySettings[key];

        // Convert value to string for storage
        if (typeof value === 'boolean') {
          value = value ? 'true' : 'false';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }

        updates.push({ key: dbKey, value });
      }
    }

    // Update each setting
    for (const update of updates) {
      await connection.query(
        'UPDATE admin_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
        [update.value, update.key]
      );
    }

    await connection.commit();

    return {
      success: true,
      message: 'Settings updated successfully',
      updatedCount: updates.length
    };
  } catch (error) {
    await connection.rollback();
    console.error('Settings Service - updateSettings error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Update a single setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {Promise<Object>} Result
 */
const updateSetting = async (key, value) => {
  try {
    const dbKey = toSnakeCase(key);

    // Convert value to string
    if (typeof value === 'boolean') {
      value = value ? 'true' : 'false';
    } else if (typeof value === 'object') {
      value = JSON.stringify(value);
    } else {
      value = String(value);
    }

    const [rows] = await pool.query(
      'CALL sp_update_admin_settings(?, ?)',
      [dbKey, value]
    );

    const result = rows[0]?.[0];
    return {
      success: result?.success === 1 || result?.success === true,
      message: result?.message || 'Setting updated'
    };
  } catch (error) {
    console.error('Settings Service - updateSetting error:', error);
    throw error;
  }
};

/**
 * Get storage statistics
 * @returns {Promise<Object>} Storage stats
 */
const getStorageStats = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_storage_stats()');

    const stats = rows[0]?.[0] || {};

    return {
      totalStorage: stats.totalStorageGB || 100,
      usedStorage: stats.usedStorageGB || 0,
      breakdown: {
        courseMaterials: stats.courseMaterialsGB || 0,
        userData: stats.userDataGB || 0,
        backups: stats.backupsGB || 0
      },
      counts: {
        courses: stats.totalCourses || 0,
        users: stats.totalUsers || 0
      }
    };
  } catch (error) {
    console.error('Settings Service - getStorageStats error:', error);
    throw error;
  }
};

/**
 * Clear system cache (placeholder - implement based on your caching strategy)
 * @returns {Promise<Object>} Result
 */
const clearCache = async () => {
  try {
    // In a real implementation, you would:
    // - Clear Redis cache
    // - Clear any in-memory caches
    // - Clear temp files
    // - etc.

    // For now, return success
    return {
      success: true,
      message: 'Cache cleared successfully',
      clearedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Settings Service - clearCache error:', error);
    throw error;
  }
};

// Helper: Convert snake_case to camelCase
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// Helper: Convert camelCase to snake_case
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

module.exports = {
  getAllSettings,
  updateSettings,
  updateSetting,
  getStorageStats,
  clearCache
};
