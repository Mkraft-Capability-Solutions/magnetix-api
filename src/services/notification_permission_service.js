const { promisePool } = require('../config/db');
const NotificationPermissionDTO = require('../dto/notification_permission_dto');

class NotificationPermissionService {
  async addPermission(user_id, permission_id) {
    const [result] = await promisePool.query(
      'CALL add_or_restore_notification_permission(?, ?)',
      [user_id, permission_id]
    );
    return { message: 'Permission added or restored successfully' };
  }

  async removePermission(user_id, permission_id) {
    await promisePool.query(
      'CALL remove_notification_permission(?, ?)',
      [user_id, permission_id]
    );
    return { message: 'Permission removed (soft delete)' };
  }

  async getUserPermissions(user_id) {
    const [rows] = await promisePool.query(
      'CALL get_user_notification_permissions(?)',
      [user_id]
    );
    return rows[0].map(row => new NotificationPermissionDTO(row));
  }

  async getAllPermissions() {
    const [rows] = await promisePool.query(
      'CALL get_all_notification_permissions()'
    );
    return rows[0].map(row => new NotificationPermissionDTO(row));
  }
}

module.exports = new NotificationPermissionService();
