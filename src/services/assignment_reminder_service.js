const { promisePool } = require('./../config/db');
const emailHelper = require('../utils/email_helper');
const { sendAssignmentEmailSafely } = require('../utils/assignment_email_helper');
const sharedAssignmentService = require('./assignment_service');

/**
 * Resolve learner profiles (uuid, email, first_name) for a list of user_ids.
 */
async function _profilesForUsers(userIds) {
  if (!userIds || userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await promisePool.query(
    `SELECT u.uuid, u.email,
            COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name) AS first_name,
            COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)  AS last_name
       FROM users u
       LEFT JOIN students s      ON u.uuid = s.user_id
       LEFT JOIN admins a        ON u.uuid = a.user_id
       LEFT JOIN instructors i   ON u.uuid = i.user_id
       LEFT JOIN super_admins sa ON u.uuid = sa.user_id
       WHERE u.uuid IN (${placeholders}) AND u.is_deleted = 0`,
    userIds
  );
  return rows;
}

/**
 * Pending recipients = scope-targeted users WITHOUT a submission row.
 */
async function _pendingRecipientsForAssignment(assignment) {
  const recipientIds = await sharedAssignmentService.getRecipientIds(assignment);
  if (recipientIds.length === 0) return [];
  const placeholders = recipientIds.map(() => '?').join(',');
  const [submitted] = await promisePool.query(
    `SELECT user_id FROM assignment_submissions
       WHERE assignment_id = ? AND user_id IN (${placeholders})`,
    [assignment.id, ...recipientIds]
  );
  const submittedSet = new Set(submitted.map(s => s.user_id));
  return recipientIds.filter(id => !submittedSet.has(id));
}

async function _findAssignmentsInWindow(sql, params) {
  const [rows] = await promisePool.query(
    `SELECT * FROM assignments WHERE is_deleted = 0 AND ${sql}`,
    params
  );
  return rows;
}

async function _runReminderPass(emailType, hoursRemaining, windowSql, windowParams, summary) {
  const assignments = await _findAssignmentsInWindow(windowSql, windowParams);
  for (const a of assignments) {
    const pendingIds = await _pendingRecipientsForAssignment(a);
    if (pendingIds.length === 0) continue;
    const profiles = await _profilesForUsers(pendingIds);
    summary.candidates += profiles.length;
    for (const p of profiles) {
      const result = await sendAssignmentEmailSafely({
        email_type: emailType,
        assignmentId: a.id,
        userId: p.uuid,
        fn: () => emailHelper.sendAssignmentReminderEmail(p.email, p.first_name || 'there', a, hoursRemaining)
      });
      if (result.skipped) summary.skipped++;
      else if (result.sent) summary.sent++;
      else summary.failed++;
    }
  }
}

async function _runMissedLearnerPass(summary) {
  // Just-expired assignments
  const assignments = await _findAssignmentsInWindow(
    'end_date BETWEEN DATE_SUB(NOW(), INTERVAL 30 MINUTE) AND NOW()',
    []
  );
  for (const a of assignments) {
    const pendingIds = await _pendingRecipientsForAssignment(a);
    if (pendingIds.length === 0) continue;
    const profiles = await _profilesForUsers(pendingIds);
    summary.candidates += profiles.length;
    for (const p of profiles) {
      const result = await sendAssignmentEmailSafely({
        email_type: 'missed_learner',
        assignmentId: a.id,
        userId: p.uuid,
        fn: () => emailHelper.sendMissedDeadlineLearnerEmail(p.email, p.first_name || 'there', a)
      });
      if (result.skipped) summary.skipped++;
      else if (result.sent) summary.sent++;
      else summary.failed++;
    }
  }
}

/**
 * Compute escalation recipients for a missed assignment:
 *  1. Creator (always)
 *  2. Team manager if scope='team' and manager != creator
 *  3. Otherwise, fall back to a single org admin (earliest-created).
 */
async function _escalationRecipientsFor(assignment) {
  const recipients = new Map();

  // 1. Creator
  const creator = await sharedAssignmentService.getCreatorProfile(assignment);
  if (creator && creator.uuid) {
    recipients.set(creator.uuid, { ...creator, role: 'creator' });
  }

  // 2. Team manager
  if (assignment.scope === 'team' && assignment.team_id) {
    const [mgrRows] = await promisePool.query(
      `SELECT t.manager_id AS uuid, u.email,
              COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name) AS first_name,
              COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)  AS last_name
         FROM teams t
         LEFT JOIN users u ON u.uuid = t.manager_id
         LEFT JOIN students s    ON u.uuid = s.user_id
         LEFT JOIN admins a      ON u.uuid = a.user_id
         LEFT JOIN instructors i ON u.uuid = i.user_id
         LEFT JOIN super_admins sa ON u.uuid = sa.user_id
         WHERE t.id = ? AND t.manager_id IS NOT NULL`,
      [assignment.team_id]
    );
    const m = mgrRows[0];
    if (m && m.uuid && m.email && !recipients.has(m.uuid)) {
      recipients.set(m.uuid, { ...m, role: 'manager' });
    }
  }

  // 3. Fallback admin if we still have nothing useful (or org-scope w/o manager)
  if (recipients.size === 0 || (assignment.scope === 'organization' && recipients.size < 1)) {
    let orgId = assignment.organization_id;
    if (!orgId && assignment.team_id) {
      const [tr] = await promisePool.query(
        'SELECT organization_id FROM teams WHERE id = ?',
        [assignment.team_id]
      );
      orgId = tr[0] && tr[0].organization_id;
    }
    if (orgId) {
      const [adminRows] = await promisePool.query(
        `SELECT u.uuid, u.email,
                COALESCE(a.first_name, ins.first_name, sa.first_name) AS first_name,
                COALESCE(a.last_name,  ins.last_name,  sa.last_name)  AS last_name
           FROM user_organizations uo
           INNER JOIN users u ON u.uuid = uo.user_id
           LEFT JOIN admins a       ON u.uuid = a.user_id
           LEFT JOIN instructors ins ON u.uuid = ins.user_id
           LEFT JOIN super_admins sa ON u.uuid = sa.user_id
           WHERE uo.organization_id = ?
             AND u.role_id = 3
             AND u.is_deleted = 0
           ORDER BY u.created_at ASC
           LIMIT 1`,
        [orgId]
      );
      const adm = adminRows[0];
      if (adm && adm.uuid && adm.email && !recipients.has(adm.uuid)) {
        recipients.set(adm.uuid, { ...adm, role: 'admin_fallback' });
      }
    }
  }

  return [...recipients.values()];
}

async function _runMissedEscalationPass(summary) {
  // T+30min .. T+1hour past deadline (single send per assignment per recipient)
  const assignments = await _findAssignmentsInWindow(
    'end_date BETWEEN DATE_SUB(NOW(), INTERVAL 60 MINUTE) AND DATE_SUB(NOW(), INTERVAL 30 MINUTE)',
    []
  );
  for (const a of assignments) {
    const pendingIds = await _pendingRecipientsForAssignment(a);
    if (pendingIds.length === 0) continue;
    const missedProfiles = await _profilesForUsers(pendingIds);
    const missedUsers = missedProfiles.map(p => ({
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
      email: p.email
    }));

    const recipients = await _escalationRecipientsFor(a);
    summary.candidates += recipients.length;
    for (const r of recipients) {
      const recipientName = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email;
      const recipientRole = r.role === 'manager' ? 'manager' : 'admin';
      const result = await sendAssignmentEmailSafely({
        email_type: 'missed_escalation',
        assignmentId: a.id,
        userId: r.uuid,
        fn: () => emailHelper.sendMissedDeadlineEscalationEmail(r.email, recipientName, a, missedUsers, recipientRole)
      });
      if (result.skipped) summary.skipped++;
      else if (result.sent) summary.sent++;
      else summary.failed++;
    }
  }
}

/**
 * One full reminder/escalation tick. Safe to call repeatedly; idempotency
 * is enforced by assignment_email_log via sendAssignmentEmailSafely.
 */
async function runReminderTick() {
  const summaries = {
    reminder_48h: { candidates: 0, sent: 0, skipped: 0, failed: 0 },
    reminder_24h: { candidates: 0, sent: 0, skipped: 0, failed: 0 },
    missed_learner: { candidates: 0, sent: 0, skipped: 0, failed: 0 },
    missed_escalation: { candidates: 0, sent: 0, skipped: 0, failed: 0 }
  };

  try {
    await _runReminderPass(
      'reminder_48h',
      48,
      'end_date BETWEEN DATE_ADD(NOW(), INTERVAL 47 HOUR) AND DATE_ADD(NOW(), INTERVAL 48 HOUR)',
      [],
      summaries.reminder_48h
    );
    await _runReminderPass(
      'reminder_24h',
      24,
      'end_date BETWEEN DATE_ADD(NOW(), INTERVAL 23 HOUR) AND DATE_ADD(NOW(), INTERVAL 24 HOUR)',
      [],
      summaries.reminder_24h
    );
    await _runMissedLearnerPass(summaries.missed_learner);
    await _runMissedEscalationPass(summaries.missed_escalation);
  } catch (err) {
    console.error('Assignment reminder tick failed:', err && err.message);
  }

  return summaries;
}

module.exports = { runReminderTick };
