const { promisePool } = require('../config/db');

/**
 * Ensures the authenticated admin and the target user (req.params.userId)
 * share at least one organization in user_organizations.
 * Super Admin (role 4) bypasses the check.
 */
exports.verifyOrgMembership = async (req, res, next) => {
  try {
    if (req.user?.role_id === 4) return next();

    const targetUserId = req.params.userId;
    const adminUuid = req.user?.uuid;

    if (!adminUuid) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const [rows] = await promisePool.query(
      `SELECT 1
         FROM user_organizations uo_admin
         INNER JOIN user_organizations uo_target
           ON uo_admin.organization_id = uo_target.organization_id
        WHERE uo_admin.user_id = ?
          AND uo_target.user_id = ?
        LIMIT 1`,
      [adminUuid, targetUserId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'This user is not a member of an organization you manage'
      });
    }

    next();
  } catch (err) {
    console.error('verifyOrgMembership error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to verify organization membership'
    });
  }
};
