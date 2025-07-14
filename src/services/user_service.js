const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dto/user_dto');

class UserService {
  // Get user by UUID with complete details using stored procedure
  async getUser(uuid) {
    const connection = await promisePool.getConnection();
    
    try {
      const [rows] = await connection.query(
        'CALL sp_get_user_details(?)',
        [uuid]
      );

      if (rows[0].length === 0) {
        throw new Error('User not found');
      }

      return new UserDTO(rows[0][0]);
    } finally {
      connection.release();
    }
  }

  // Update user details using stored procedure
  async updateUserDetails(uuid, updateData) {
    const connection = await promisePool.getConnection();
    
    try {
      const [rows] = await connection.query(
        'CALL sp_update_user_details(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          uuid,
          updateData.first_name || null,
          updateData.last_name || null,
          updateData.contact || null,
          updateData.gender || null,
          updateData.dob || null,
          updateData.address || null,
          updateData.city || null,
          updateData.state || null,
          updateData.country || null,
          updateData.social_links ? JSON.stringify(updateData.social_links) : null,
          updateData.about || null,
          updateData.resume_url || null,
          updateData.profile_visibility || null
        ]
      );

      return new UserDTO(rows[0][0]);
    } finally {
      connection.release();
    }
  }

  // Soft delete user using stored procedure
  async deleteUser(uuid) {
    const connection = await promisePool.getConnection();
    try {
      const [result] = await connection.query(
        'CALL sp_delete_user(?)',
        [uuid]
      );

      if (result[0][0].result === 0) {
        throw new Error('User not found or already deleted');
      }

      return {
        success: true,
        affectedRows: result[0][0].result
      };
    } finally {
      connection.release();
    }
  }

  // Update user password using stored procedure
  async updateUserPassword(uuid, currentPassword, newPassword) {
    const connection = await promisePool.getConnection();
    try {
      // First get the current password hash to verify
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
      
      // Call stored procedure with hashed password
      const [result] = await connection.query(
        'CALL sp_update_user_password(?, ?, ?)',
        [uuid, currentPassword, hashedPassword]
      );

      if (result[0][0].result === 0) {
        throw new Error('Password update failed');
      }

      return true;
    } finally {
      connection.release();
    }
  }

  // Update profile picture using stored procedure
  async updateProfilePicture(uuid, imagePath) {
    const connection = await promisePool.getConnection();
    
    try {
      const [rows] = await connection.query(
        'CALL sp_update_profile_picture(?, ?)',
        [uuid, imagePath]
      );

      return new UserDTO(rows[0][0]);
    } finally {
      connection.release();
    }
  }
}

module.exports = new UserService();