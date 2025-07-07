const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dto/user_dto');

class UserService {
  // Get role table name based on role_id
  getRoleTable(roleId) {
    switch (roleId) {
      case 1: return 'students';
      case 2: return 'instructors';
      case 3: return 'admins';
      case 4: return 'super_admins';
      default: throw new Error('Invalid role ID');
    }
  }

  // Get user by UUID with complete details
  async getUser(uuid) {
    const connection = await promisePool.getConnection();
    
    try {
      // Get user from users table
      const [userRows] = await connection.query(
        'SELECT * FROM users WHERE uuid = ? AND is_deleted = 0',
        [uuid]
      );

      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      const user = userRows[0];
      const roleTable = this.getRoleTable(user.role_id);

      // Get user details from role-specific table
      const [detailRows] = await connection.query(
        `SELECT * FROM ${roleTable} WHERE user_id = ?`,
        [uuid]
      );

      if (detailRows.length === 0) {
        throw new Error('User details not found');
      }

      // Combine user data
      const userData = {
        ...user,
        ...detailRows[0]
      };

      return new UserDTO(userData);
    } finally {
      connection.release();
    }
  }

  // Update user details
  async updateUserDetails(uuid, updateData) {
    const connection = await promisePool.getConnection();
    
    try {
      // Get user to determine role
      const [userRows] = await connection.query(
        'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0',
        [uuid]
      );

      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      const roleTable = this.getRoleTable(userRows[0].role_id);
      
      // Prepare update fields and values
      const fieldsToUpdate = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        // Skip fields that shouldn't be updated here
        if (['uuid', 'email', 'password', 'role_id', 'status', 'is_deleted'].includes(key)) {
          continue;
        }
        
        fieldsToUpdate.push(`${key} = ?`);
        values.push(value);
      }
      
      if (fieldsToUpdate.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(uuid);
      
      // Update role-specific table
      await connection.query(
        `UPDATE ${roleTable} SET ${fieldsToUpdate.join(', ')} WHERE user_id = ?`,
        values
      );

      // Update users table timestamp
      await connection.query(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE uuid = ?',
        [uuid]
      );

      return this.getUser(uuid);
    } finally {
      connection.release();
    }
  }

  // Soft delete user
  async deleteUser(uuid) {
    const connection = await promisePool.getConnection();
    try {
      // Execute update and capture result
      const [result] = await connection.query(
        `UPDATE users 
        SET is_deleted = 1, 
            status = 'inactive', 
            session_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ? AND is_deleted = 0`,
        [uuid]
      );

      // Check if any rows were affected
      if (result.affectedRows === 0) {
        throw new Error('User not found or already deleted');
      }

      // Optional: Log the deletion
      console.log(`User ${uuid} soft-deleted. Rows affected: ${result.affectedRows}`);

      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error(`Error deleting user ${uuid}:`, error);
      throw error; // Re-throw for controller to handle
    } finally {
      connection.release();
    }
  }

  // Update user password
  async updateUserPassword(uuid, currentPassword, newPassword) {
    const connection = await promisePool.getConnection();
    try {
      // First get the current password hash
      const [userRows] = await connection.query(
        'SELECT password FROM users WHERE uuid = ? AND is_deleted = 0',
        [uuid]
      );

      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, userRows[0].password);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const [result] = await connection.query(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?',
        [hashedPassword, uuid]
      );

      if (result.affectedRows === 0) {
        throw new Error('Password update failed');
      }

      return true;
    } finally {
      connection.release();
    }
  }

  // Update profile picture
  async updateProfilePicture(uuid, imagePath) {
    const connection = await promisePool.getConnection();
    
    try {
      // Get user to determine role
      const [userRows] = await connection.query(
        'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0',
        [uuid]
      );

      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      const roleTable = this.getRoleTable(userRows[0].role_id);
      
      // Update profile picture path
      await connection.query(
        `UPDATE ${roleTable} SET dp = ? WHERE user_id = ?`,
        [imagePath, uuid]
      );

      // Update users table timestamp
      await connection.query(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE uuid = ?',
        [uuid]
      );

      return this.getUser(uuid);
    } finally {
      connection.release();
    }
  }
}

module.exports = new UserService();