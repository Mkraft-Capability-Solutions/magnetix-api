/**
 * Shared writer for `permission_audit_log`.
 *
 * One generic audit trail backs RBAC changes, manager reassignments and
 * content lifecycle transitions. Keep writes best-effort: an audit failure
 * must never roll back or fail the underlying action.
 */

const { promisePool } = require('../config/db');

/**
 * @param {object} entry
 * @param {string} entry.actorUuid   - who performed the action (req.user.uuid)
 * @param {string} entry.action      - e.g. 'role.perm.grant', 'user.manager.reassign', 'course.lifecycle'
 * @param {string} entry.targetType  - 'role' | 'user' | 'course'
 * @param {string|number} entry.targetId
 * @param {object} [entry.detail]    - arbitrary JSON context
 */
async function writeAudit({ actorUuid, action, targetType, targetId, detail }) {
  try {
    await promisePool.query(
      `INSERT INTO permission_audit_log
         (actor_uuid, action, target_type, target_id, detail_json)
       VALUES (?, ?, ?, ?, ?)`,
      [
        actorUuid,
        action,
        targetType,
        String(targetId),
        detail ? JSON.stringify(detail) : null
      ]
    );
  } catch (error) {
    // Never let auditing break the real operation.
    console.error('writeAudit error (non-fatal):', error.message);
  }
}

module.exports = { writeAudit };
