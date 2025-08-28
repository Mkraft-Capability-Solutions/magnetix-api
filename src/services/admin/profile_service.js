const { promisePool } = require("../../config/db");
class AdminProfileService {
 async getProfileById(userId) {
    const [rows] = await promisePool.query(
      `
      SELECT 
        admins.*, 
        users.email
      FROM admins
      JOIN users 
        ON admins.user_id = users.uuid
      WHERE admins.user_id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error("User not found " + userId);
    }
    return rows[0];
  }

  async updateProfile(userId, data) {
    const {
      first_name,
      last_name,
      contact,
      gender,
      dob,
      address,
      city,
      state,
      country,
      dp,
      social_links,
      about,
      resume_url,
      profile_visibility,
    } = data;

    // Update admins table
    await promisePool.query(
      `UPDATE admins
     SET first_name = ?, last_name = ?, contact = ?, gender = ?, dob = ?, address = ?, city = ?, 
         state = ?, country = ?, dp = ?, social_links = ?, about = ?, resume_url = ?, 
         profile_visibility = ?
     WHERE user_id = ?`,
      [
        first_name,
        last_name,
        contact,
        gender,
        dob,
        address,
        city,
        state,
        country,
        dp,
        social_links,
        about,
        resume_url,
        profile_visibility,
        userId,
      ]
    );

    return true;
  }
}
module.exports = new AdminProfileService();