/**
 * Shared organization-scoping helpers for admin-side services.
 *
 * Org admins (role_id=3) should only see/touch data tied to organizations
 * they belong to. Super admins (role_id=4) are unrestricted. These helpers
 * centralize that rule so every admin service can apply the same filter.
 */

const { promisePool: pool } = require('../config/db');

const ROLE_SUPER_ADMIN = 4;

/**
 * @returns {Promise<number[]>} Org IDs the user is a member of (may be empty).
 */
const getCallerOrgIds = async (uuid) => {
  if (!uuid) return [];
  const [rows] = await pool.query(
    'SELECT organization_id FROM user_organizations WHERE user_id = ?',
    [uuid]
  );
  return rows.map((r) => r.organization_id);
};

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * Throws 403 if the caller is not in the given org.
 * Super-admins bypass the check.
 */
const assertCallerInOrg = async (callerUuid, roleId, orgId) => {
  if (roleId === ROLE_SUPER_ADMIN) return;
  const callerOrgs = await getCallerOrgIds(callerUuid);
  if (!callerOrgs.includes(Number(orgId))) {
    throw httpError(403, 'You do not have access to this organization');
  }
};

module.exports = {
  ROLE_SUPER_ADMIN,
  getCallerOrgIds,
  assertCallerInOrg,
  httpError
};
