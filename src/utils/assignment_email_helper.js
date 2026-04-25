const { promisePool } = require('../config/db');

const VALID_TYPES = new Set([
  'created', 'reminder_48h', 'reminder_24h', 'missed_learner',
  'missed_escalation', 'submission_confirm', 'submission_received',
  'review_completed', 'manager_assigned'
]);

const sendAssignmentEmailSafely = async ({ email_type, assignmentId, userId, fn }) => {
  if (!email_type || !VALID_TYPES.has(email_type)) {
    console.error(`assignment_email_helper: invalid email_type "${email_type}"`);
    return { sent: false, skipped: false, error: new Error('invalid email_type') };
  }
  if (!assignmentId || !userId || typeof fn !== 'function') {
    console.error('assignment_email_helper: missing assignmentId/userId/fn');
    return { sent: false, skipped: false, error: new Error('missing args') };
  }

  try {
    const [existing] = await promisePool.query(
      'SELECT id FROM assignment_email_log WHERE assignment_id = ? AND user_id = ? AND email_type = ? LIMIT 1',
      [assignmentId, userId, email_type]
    );
    if (existing.length > 0) {
      return { sent: false, skipped: true };
    }
  } catch (err) {
    console.error('assignment_email_helper: log lookup failed:', err);
  }

  let info;
  try {
    info = await fn();
  } catch (error) {
    console.error(`assignment_email_helper: send failed for ${email_type} (assignment ${assignmentId}, user ${userId}):`, error);
    return { sent: false, skipped: false, error };
  }

  try {
    await promisePool.query(
      'INSERT INTO assignment_email_log (assignment_id, user_id, email_type, message_id) VALUES (?, ?, ?, ?)',
      [assignmentId, userId, email_type, (info && info.messageId) ? info.messageId.toString().slice(0, 255) : null]
    );
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return { sent: true, skipped: false, info };
    }
    console.error('assignment_email_helper: log insert failed:', err);
  }

  return { sent: true, skipped: false, info };
};

module.exports = { sendAssignmentEmailSafely };
