const { promisePool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Shared assignment business logic. Used by admin, manager and student services
 * so visibility / validation / scope rules live in one place.
 */

const VALID_TYPES = new Set(['document', 'assessment']);
const VALID_SCOPES = new Set(['organization', 'team']);
const ADMIN_ROLES = new Set([3, 4]);

const DEFAULT_FILE_TYPES = 'pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,png';
const DEFAULT_MAX_MB = 25;

/**
 * Validate the body for create or PATCH. For PATCH pass `partial=true` to skip
 * required-ness checks; only present fields are validated.
 */
async function validateAssignmentInput(input, { partial = false, existing = null } = {}) {
  const errors = [];

  const has = (k) => Object.prototype.hasOwnProperty.call(input, k);

  // type
  if (!partial || has('type')) {
    if (!input.type || !VALID_TYPES.has(input.type)) {
      errors.push({ field: 'type', message: `type must be one of: ${[...VALID_TYPES].join(', ')}` });
    }
  }
  // title
  if (!partial || has('title')) {
    if (!input.title || typeof input.title !== 'string' || input.title.trim().length < 2) {
      errors.push({ field: 'title', message: 'title is required (min 2 chars)' });
    }
  }
  // description (optional, but cap length)
  if (input.description && typeof input.description !== 'string') {
    errors.push({ field: 'description', message: 'description must be a string' });
  }
  // dates
  let start = null, end = null;
  if (!partial || has('start_date')) {
    start = input.start_date ? new Date(input.start_date) : null;
    if (!start || Number.isNaN(start.getTime())) errors.push({ field: 'start_date', message: 'start_date required (ISO datetime)' });
  }
  if (!partial || has('end_date')) {
    end = input.end_date ? new Date(input.end_date) : null;
    if (!end || Number.isNaN(end.getTime())) errors.push({ field: 'end_date', message: 'end_date required (ISO datetime)' });
  }
  if (start && end && start.getTime() >= end.getTime()) {
    errors.push({ field: 'end_date', message: 'end_date must be after start_date' });
  }
  if (!partial && end && end.getTime() <= Date.now()) {
    errors.push({ field: 'end_date', message: 'end_date must be in the future' });
  }
  // scope
  if (!partial || has('scope')) {
    if (!input.scope || !VALID_SCOPES.has(input.scope)) {
      errors.push({ field: 'scope', message: `scope must be one of: ${[...VALID_SCOPES].join(', ')}` });
    } else if (input.scope === 'organization' && !input.organization_id) {
      errors.push({ field: 'organization_id', message: 'organization_id is required when scope=organization' });
    } else if (input.scope === 'team' && !input.team_id) {
      errors.push({ field: 'team_id', message: 'team_id is required when scope=team' });
    }
  }
  // assessment_id required when type=assessment
  const effectiveType = (input.type || (existing && existing.type));
  if (effectiveType === 'assessment') {
    const assessmentId = has('assessment_id') ? input.assessment_id : (existing && existing.assessment_id);
    if (!assessmentId) {
      errors.push({ field: 'assessment_id', message: 'assessment_id is required when type=assessment' });
    } else if (!partial || has('assessment_id')) {
      const [forms] = await promisePool.query(
        `SELECT id FROM feedback_forms WHERE id = ? AND type = 'assessment' AND is_deleted = 0 LIMIT 1`,
        [assessmentId]
      );
      if (forms.length === 0) {
        errors.push({ field: 'assessment_id', message: 'assessment not found or not type=assessment' });
      }
    }
  }
  // numeric guards
  if (has('max_file_size_mb') && (!Number.isFinite(input.max_file_size_mb) || input.max_file_size_mb < 1 || input.max_file_size_mb > 200)) {
    errors.push({ field: 'max_file_size_mb', message: 'max_file_size_mb must be 1..200' });
  }

  return errors;
}

/**
 * Verify the actor is allowed to create an assignment with the given scope.
 * - admin/super_admin: must be a member of the target organization (or any org if super)
 * - manager: must own the target team (and scope must be 'team')
 */
async function authorizeCreate(user, input) {
  if (!user || !user.uuid) {
    const err = new Error('Not authenticated'); err.statusCode = 401; throw err;
  }
  if (user.role_id === 4) return; // super admin

  if (input.scope === 'team') {
    const [teamRows] = await promisePool.query(
      `SELECT id, organization_id, manager_id FROM teams WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [input.team_id]
    );
    if (teamRows.length === 0) {
      const err = new Error('Team not found'); err.statusCode = 404; throw err;
    }
    const team = teamRows[0];

    if (ADMIN_ROLES.has(user.role_id)) {
      if (team.organization_id) {
        const [memberRows] = await promisePool.query(
          'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
          [user.uuid, team.organization_id]
        );
        if (memberRows.length === 0) {
          const err = new Error('You are not a member of this team\'s organization'); err.statusCode = 403; throw err;
        }
      }
      return;
    }

    // Manager
    if (team.manager_id !== user.uuid) {
      const err = new Error('You are not the manager of this team'); err.statusCode = 403; throw err;
    }
    return;
  }

  if (input.scope === 'organization') {
    if (!ADMIN_ROLES.has(user.role_id)) {
      const err = new Error('Only admins can create organization-scoped assignments'); err.statusCode = 403; throw err;
    }
    const [orgRows] = await promisePool.query(
      'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
      [user.uuid, input.organization_id]
    );
    if (orgRows.length === 0) {
      const err = new Error('You are not a member of this organization'); err.statusCode = 403; throw err;
    }
  }
}

async function createAssignment(user, input) {
  const errors = await validateAssignmentInput(input);
  if (errors.length > 0) {
    const err = new Error('Validation failed');
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }
  await authorizeCreate(user, input);

  const uuid = uuidv4();
  const params = [
    uuid,
    input.title.trim(),
    input.description || null,
    input.type,
    input.type === 'assessment' ? input.assessment_id : null,
    input.type === 'document' ? (input.doc_instructions || null) : null,
    input.allow_resubmission ? 1 : 0,
    Number.isFinite(input.max_file_size_mb) ? input.max_file_size_mb : DEFAULT_MAX_MB,
    typeof input.allowed_file_types === 'string' && input.allowed_file_types.trim().length > 0
      ? input.allowed_file_types.trim().toLowerCase()
      : DEFAULT_FILE_TYPES,
    input.scope,
    input.scope === 'organization' ? input.organization_id : null,
    input.scope === 'team' ? input.team_id : null,
    new Date(input.start_date),
    new Date(input.end_date),
    user.uuid
  ];

  const [result] = await promisePool.query(
    `INSERT INTO assignments
     (uuid, title, description, type, assessment_id, doc_instructions,
      allow_resubmission, max_file_size_mb, allowed_file_types,
      scope, organization_id, team_id, start_date, end_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params
  );
  return getAssignmentById(result.insertId);
}

async function getAssignmentById(id) {
  const [rows] = await promisePool.query(
    `SELECT a.*,
            (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submitted_count
       FROM assignments a
       WHERE a.id = ? AND a.is_deleted = 0
       LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getAssignmentByUuid(uuid) {
  const [rows] = await promisePool.query(
    `SELECT a.* FROM assignments a WHERE a.uuid = ? AND a.is_deleted = 0 LIMIT 1`,
    [uuid]
  );
  return rows[0] || null;
}

/**
 * Returns the array of user_ids (uuids) targeted by an assignment.
 * organization-scope: members of the org
 * team-scope: members of the team
 */
async function getRecipientIds(assignment) {
  if (assignment.scope === 'organization' && assignment.organization_id) {
    const [rows] = await promisePool.query(
      `SELECT uo.user_id
         FROM user_organizations uo
         INNER JOIN users u ON u.uuid = uo.user_id
         WHERE uo.organization_id = ? AND u.is_deleted = 0 AND u.role_id = 1`,
      [assignment.organization_id]
    );
    return rows.map(r => r.user_id);
  }
  if (assignment.scope === 'team' && assignment.team_id) {
    const [rows] = await promisePool.query(
      `SELECT tm.user_id
         FROM team_members tm
         INNER JOIN users u ON u.uuid = tm.user_id
         WHERE tm.team_id = ? AND u.is_deleted = 0`,
      [assignment.team_id]
    );
    return rows.map(r => r.user_id);
  }
  return [];
}

/**
 * Same as getRecipientIds but returns name/email too — for emails.
 */
async function getRecipientsWithProfiles(assignment) {
  let rows = [];
  if (assignment.scope === 'organization' && assignment.organization_id) {
    [rows] = await promisePool.query(
      `SELECT u.uuid AS user_id, u.email,
              COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name) AS first_name,
              COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)  AS last_name
         FROM user_organizations uo
         INNER JOIN users u ON u.uuid = uo.user_id
         LEFT JOIN students s      ON u.uuid = s.user_id
         LEFT JOIN admins a        ON u.uuid = a.user_id
         LEFT JOIN instructors i   ON u.uuid = i.user_id
         LEFT JOIN super_admins sa ON u.uuid = sa.user_id
         WHERE uo.organization_id = ? AND u.is_deleted = 0 AND u.role_id = 1`,
      [assignment.organization_id]
    );
  } else if (assignment.scope === 'team' && assignment.team_id) {
    [rows] = await promisePool.query(
      `SELECT u.uuid AS user_id, u.email,
              COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name) AS first_name,
              COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)  AS last_name
         FROM team_members tm
         INNER JOIN users u ON u.uuid = tm.user_id
         LEFT JOIN students s      ON u.uuid = s.user_id
         LEFT JOIN admins a        ON u.uuid = a.user_id
         LEFT JOIN instructors i   ON u.uuid = i.user_id
         LEFT JOIN super_admins sa ON u.uuid = sa.user_id
         WHERE tm.team_id = ? AND u.is_deleted = 0`,
      [assignment.team_id]
    );
  }
  return rows;
}

/**
 * Returns the user-row for the assignment creator (for emails).
 */
async function getCreatorProfile(assignment) {
  const [rows] = await promisePool.query(
    `SELECT u.uuid, u.email, u.role_id,
            COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name) AS first_name,
            COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)  AS last_name
       FROM users u
       LEFT JOIN students s      ON u.uuid = s.user_id
       LEFT JOIN admins a        ON u.uuid = a.user_id
       LEFT JOIN instructors i   ON u.uuid = i.user_id
       LEFT JOIN super_admins sa ON u.uuid = sa.user_id
       WHERE u.uuid = ?
       LIMIT 1`,
    [assignment.created_by]
  );
  return rows[0] || null;
}

/**
 * Pre-submission checks. Returns either { ok: true, existing } or throws.
 */
async function assertSubmittable(assignment, userId) {
  if (!assignment || assignment.is_deleted) {
    const err = new Error('Assignment not found'); err.statusCode = 404; throw err;
  }
  const now = Date.now();
  const start = new Date(assignment.start_date).getTime();
  const end = new Date(assignment.end_date).getTime();
  if (now < start) {
    const err = new Error('Assignment is not open yet'); err.statusCode = 409; throw err;
  }
  if (now > end) {
    const err = new Error('Assignment deadline has passed'); err.statusCode = 409; throw err;
  }

  const [existing] = await promisePool.query(
    'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? LIMIT 1',
    [assignment.id, userId]
  );
  if (existing.length > 0 && !assignment.allow_resubmission) {
    const err = new Error('Resubmissions are not allowed for this assignment'); err.statusCode = 409; throw err;
  }
  return { ok: true, existing: existing[0] || null };
}

/**
 * Insert or update the single submission row. Caller computes file/assessment fields.
 */
async function upsertSubmission(assignment, userId, fields) {
  const existing = await promisePool.query(
    'SELECT id, uuid FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? LIMIT 1',
    [assignment.id, userId]
  );
  const existingRow = existing[0][0];

  if (existingRow) {
    await promisePool.query(
      `UPDATE assignment_submissions
          SET submission_type = ?,
              file_url = ?,
              file_name = ?,
              file_size_bytes = ?,
              assessment_response_id = ?,
              notes = ?,
              status = 'submitted',
              reviewed_by = NULL,
              reviewed_at = NULL,
              feedback = NULL,
              submitted_at = NOW()
        WHERE id = ?`,
      [
        fields.submission_type,
        fields.file_url || null,
        fields.file_name || null,
        fields.file_size_bytes || null,
        fields.assessment_response_id || null,
        fields.notes || null,
        existingRow.id
      ]
    );
    const [rows] = await promisePool.query(
      'SELECT * FROM assignment_submissions WHERE id = ?',
      [existingRow.id]
    );
    return { row: rows[0], created: false };
  }

  const newUuid = uuidv4();
  const [result] = await promisePool.query(
    `INSERT INTO assignment_submissions
       (uuid, assignment_id, user_id, submission_type, file_url, file_name,
        file_size_bytes, assessment_response_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newUuid,
      assignment.id,
      userId,
      fields.submission_type,
      fields.file_url || null,
      fields.file_name || null,
      fields.file_size_bytes || null,
      fields.assessment_response_id || null,
      fields.notes || null
    ]
  );
  const [rows] = await promisePool.query(
    'SELECT * FROM assignment_submissions WHERE id = ?',
    [result.insertId]
  );
  return { row: rows[0], created: true };
}

/**
 * Soft-delete.
 */
async function softDeleteAssignment(id) {
  const [r] = await promisePool.query(
    'UPDATE assignments SET is_deleted = 1 WHERE id = ?',
    [id]
  );
  return r.affectedRows;
}

/**
 * Patch update with validation. Locks type/scope/target if any submissions exist.
 */
async function patchAssignment(id, input) {
  const existing = await getAssignmentById(id);
  if (!existing) {
    const err = new Error('Assignment not found'); err.statusCode = 404; throw err;
  }

  const errors = await validateAssignmentInput(input, { partial: true, existing });
  if (errors.length > 0) {
    const err = new Error('Validation failed'); err.statusCode = 400; err.details = errors; throw err;
  }

  const submittedCount = existing.submitted_count || 0;
  const lockedKeys = ['type', 'assessment_id', 'scope', 'organization_id', 'team_id'];
  if (submittedCount > 0) {
    for (const k of lockedKeys) {
      if (Object.prototype.hasOwnProperty.call(input, k) && input[k] !== existing[k]) {
        const err = new Error(`Cannot modify "${k}" once submissions exist`); err.statusCode = 409; throw err;
      }
    }
  }

  const allowed = [
    'title', 'description', 'doc_instructions', 'allow_resubmission',
    'max_file_size_mb', 'allowed_file_types', 'start_date', 'end_date'
  ];
  const sets = [];
  const params = [];
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, k)) {
      sets.push(`${k} = ?`);
      let value = input[k];
      if (k === 'allow_resubmission') value = value ? 1 : 0;
      if (k === 'start_date' || k === 'end_date') value = new Date(value);
      if (k === 'allowed_file_types' && typeof value === 'string') value = value.toLowerCase();
      params.push(value);
    }
  }
  if (sets.length > 0) {
    params.push(id);
    await promisePool.query(
      `UPDATE assignments SET ${sets.join(', ')} WHERE id = ? AND is_deleted = 0`,
      params
    );
  }
  return getAssignmentById(id);
}

module.exports = {
  validateAssignmentInput,
  authorizeCreate,
  createAssignment,
  patchAssignment,
  softDeleteAssignment,
  getAssignmentById,
  getAssignmentByUuid,
  getRecipientIds,
  getRecipientsWithProfiles,
  getCreatorProfile,
  assertSubmittable,
  upsertSubmission,
  DEFAULT_FILE_TYPES,
  DEFAULT_MAX_MB
};
