const { promisePool: pool } = require('../../config/db');
const emailHelper = require('../../utils/email_helper');
const notificationService = require('../../services/notification_service');
const {
  ROLE_SUPER_ADMIN,
  getCallerOrgIds: _getUserOrganizationIds,
  httpError: _httpError
} = require('../../utils/org_scoping');

/**
 * Admin Team Service
 * Handles all business logic for team management.
 *
 * Org-scoping rule: org admins (role_id=3) only see/modify teams in
 * organizations they belong to. Super-admins (role_id=4) are unrestricted.
 * Helpers live in `src/utils/org_scoping.js` and are reused across services.
 */

/**
 * Resolve which organization to attach a new team to.
 *   role 4 (super-admin): pass through requestedOrgId verbatim (incl. null).
 *   role 3 (admin):
 *     - requestedOrgId given → caller must be member; else 403
 *     - requestedOrgId null  → caller's single org auto-applies; 0 orgs → 400; 2+ orgs → 400 (must pick)
 */
const _resolveAdminOrganizationId = async (callerUuid, roleId, requestedOrgId) => {
  if (roleId === ROLE_SUPER_ADMIN) {
    return requestedOrgId || null;
  }

  const callerOrgs = await _getUserOrganizationIds(callerUuid);

  if (requestedOrgId) {
    const requested = Number(requestedOrgId);
    if (!callerOrgs.includes(requested)) {
      throw _httpError(403, 'You are not a member of the selected organization');
    }
    return requested;
  }

  if (callerOrgs.length === 0) {
    throw _httpError(400, 'Your account is not a member of any organization. Contact a super-admin.');
  }
  if (callerOrgs.length > 1) {
    throw _httpError(400, 'You belong to multiple organizations — please pick one when creating the team.');
  }
  return callerOrgs[0];
};

/**
 * Verify the caller is allowed to act on the given team.
 *   - role 4: always allowed
 *   - team.organization_id set:    caller must be a member of that org
 *   - team.organization_id NULL:   only the team's `created_by` (or super-admin) may act
 *
 * Returns the loaded team row (so callers don't re-query).
 */
const _assertCallerCanAccessTeam = async (callerUuid, roleId, teamId) => {
  const [teamRows] = await pool.query(
    'SELECT id, organization_id, manager_id, created_by FROM teams WHERE id = ? AND is_deleted = 0',
    [teamId]
  );
  if (teamRows.length === 0) {
    throw _httpError(404, 'Team not found');
  }
  const team = teamRows[0];

  if (roleId === ROLE_SUPER_ADMIN) return team;

  // Team managers — including transitively via the reports_to hierarchy —
  // can access their own team's data even if they aren't admins of the org.
  // (A learner-as-manager won't be in user_organizations of the org's admin
  // membership, but they still need to read their team's members/history.)
  if (callerUuid) {
    if (team.manager_id === callerUuid) return team;
    try {
      const { canUserViewTeamViaHierarchy } = require('../../utils/manager_hierarchy');
      const ok = await canUserViewTeamViaHierarchy(callerUuid, team.id);
      if (ok) return team;
    } catch (_) {
      // fall through to the org check
    }
  }

  if (team.organization_id == null) {
    if (team.created_by !== callerUuid) {
      throw _httpError(403, 'This team is not assigned to any organization. Only its creator or a super-admin can modify it.');
    }
    return team;
  }

  const callerOrgs = await _getUserOrganizationIds(callerUuid);
  if (!callerOrgs.includes(team.organization_id)) {
    throw _httpError(403, 'You do not have access to this team');
  }
  return team;
};

/**
 * Resolve the user's display name + email + the team's metadata so we can
 * send the manager-assigned email/notification with useful content.
 */
const _fetchManagerNotificationContext = async (teamId, managerUserId) => {
  const [teamRows] = await pool.query(
    `SELECT t.id, t.name, t.organization_id, o.name AS organization_name,
            (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM teams t
       LEFT JOIN organizations o ON t.organization_id = o.id
       WHERE t.id = ? AND t.is_deleted = 0`,
    [teamId]
  );
  const team = teamRows[0] || null;
  if (!team) return null;

  const [userRows] = await pool.query(
    `SELECT u.uuid, u.email,
            COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name) AS first_name,
            COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)  AS last_name
       FROM users u
       LEFT JOIN students s        ON u.uuid = s.user_id
       LEFT JOIN admins a          ON u.uuid = a.user_id
       LEFT JOIN instructors i     ON u.uuid = i.user_id
       LEFT JOIN super_admins sa   ON u.uuid = sa.user_id
       WHERE u.uuid = ? AND u.is_deleted = 0
       LIMIT 1`,
    [managerUserId]
  );
  const user = userRows[0] || null;
  if (!user) return { team, user: null };

  return { team, user };
};

const _notifyManagerAssigned = async (teamId, managerUserId) => {
  try {
    const ctx = await _fetchManagerNotificationContext(teamId, managerUserId);
    if (!ctx || !ctx.user) return;
    const fullName = [ctx.user.first_name, ctx.user.last_name].filter(Boolean).join(' ') || 'there';

    // Email
    try {
      await emailHelper.sendManagerAssignedEmail(ctx.user.email, fullName, {
        name: ctx.team.name,
        memberCount: ctx.team.member_count,
        organizationName: ctx.team.organization_name
      });
    } catch (err) {
      console.error('Manager-assigned email failed:', err && err.message);
    }

    // In-app
    try {
      await notificationService.createSystemNotification(
        ctx.user.uuid,
        `You're now managing ${ctx.team.name}`,
        `You have been assigned as the manager of "${ctx.team.name}". You can now create assignments and review submissions for this team.`,
        'assignment',
        `${process.env.FRONTEND_URL || ''}/manager`,
        { teamId: ctx.team.id }
      );
    } catch (err) {
      console.error('Manager-assigned in-app notification failed:', err && err.message);
    }
  } catch (err) {
    console.error('_notifyManagerAssigned error:', err && err.message);
  }
};

/**
 * Get teams visible to the calling admin.
 *   role 4 (super-admin): all teams.
 *   role 3 (admin):       teams whose organization_id is in the admin's
 *                         user_organizations, plus teams the admin created
 *                         that have no organization yet.
 *
 * Returns the same shape as the previous sp_get_all_teams() call.
 */
const getAllTeams = async (callerUuid, roleId) => {
  // Column aliases match the legacy `sp_get_all_teams()` contract:
  //   createdAt / memberCount  (camelCase) — consumed by existing UI
  // Plus new fields needed by the assignment-create dropdown:
  //   organization_id, organization_name, manager_id, manager_name (snake_case)
  const baseSelect = `
    SELECT
        t.id,
        t.name,
        t.description,
        t.created_at AS createdAt,
        t.organization_id,
        o.name AS organization_name,
        t.manager_id,
        NULLIF(TRIM(CONCAT_WS(' ',
          COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name),
          COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)
        )), '') AS manager_name,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS memberCount
       FROM teams t
       LEFT JOIN organizations o ON t.organization_id = o.id
       LEFT JOIN students s      ON t.manager_id = s.user_id
       LEFT JOIN admins a        ON t.manager_id = a.user_id
       LEFT JOIN instructors i   ON t.manager_id = i.user_id
       LEFT JOIN super_admins sa ON t.manager_id = sa.user_id`;

  try {
    if (roleId === ROLE_SUPER_ADMIN) {
      const [rows] = await pool.query(
        `${baseSelect}
         WHERE t.is_deleted = 0
         ORDER BY t.created_at DESC`
      );
      return rows;
    }

    // role 3: scope to caller's organizations + their own orphan teams
    const [rows] = await pool.query(
      `${baseSelect}
       WHERE t.is_deleted = 0
         AND (
           t.organization_id IN (
             SELECT organization_id FROM user_organizations WHERE user_id = ?
           )
           OR (t.organization_id IS NULL AND t.created_by = ?)
         )
       ORDER BY t.created_at DESC`,
      [callerUuid, callerUuid]
    );
    return rows;
  } catch (error) {
    console.error('Team Service - getAllTeams error:', error);
    throw error;
  }
};

/**
 * Get team by ID with members. Org-scoped: org-admins can only read teams
 * in their own organizations (or unassigned teams they created).
 */
const getTeamById = async (teamId, callerUuid, roleId) => {
  try {
    await _assertCallerCanAccessTeam(callerUuid, roleId, teamId);
    const [rows] = await pool.query('CALL sp_get_team_by_id(?)', [teamId]);
    const team = rows[0]?.[0] || null;
    const members = rows[1] || [];

    // sp_get_team_by_id doesn't return manager_id/manager_name — patch them in
    // from the teams table directly so the admin "Manager: …" UI and the per-row
    // pill can detect the current manager. Same JOINs we use in getAllTeams.
    if (team) {
      const [mgrRows] = await pool.query(
        `SELECT
            t.manager_id,
            NULLIF(TRIM(CONCAT_WS(' ',
              COALESCE(s.first_name, a.first_name, i.first_name, sa.first_name),
              COALESCE(s.last_name,  a.last_name,  i.last_name,  sa.last_name)
            )), '') AS manager_name
          FROM teams t
          LEFT JOIN students s      ON t.manager_id = s.user_id
          LEFT JOIN admins a        ON t.manager_id = a.user_id
          LEFT JOIN instructors i   ON t.manager_id = i.user_id
          LEFT JOIN super_admins sa ON t.manager_id = sa.user_id
          WHERE t.id = ? AND t.is_deleted = 0
          LIMIT 1`,
        [teamId]
      );
      if (mgrRows[0]) {
        team.manager_id = mgrRows[0].manager_id;
        team.manager_name = mgrRows[0].manager_name;
      }
    }

    return { team, members };
  } catch (error) {
    console.error('Team Service - getTeamById error:', error);
    throw error;
  }
};

/**
 * Create a new team. Caller's role determines org-resolution behavior:
 *   - role 4: organizationId pass-through (may be null).
 *   - role 3: organizationId must be one of caller's orgs; if omitted and
 *             caller is in exactly one org, it auto-applies. 0 or >1 → 400.
 */
const createTeam = async (
  name,
  description,
  createdBy,
  organizationId = null,
  managerId = null,
  roleId = ROLE_SUPER_ADMIN
) => {
  try {
    const resolvedOrgId = await _resolveAdminOrganizationId(createdBy, roleId, organizationId);

    if (managerId && resolvedOrgId) {
      const [memberRows] = await pool.query(
        'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
        [managerId, resolvedOrgId]
      );
      if (memberRows.length === 0) {
        throw _httpError(400, 'Manager must be a member of the team\'s organization');
      }
    }

    const [rows] = await pool.query(
      'CALL sp_create_team(?, ?, ?, ?, ?)',
      [name, description, createdBy, resolvedOrgId, managerId]
    );
    const result = rows[0]?.[0] || null;

    if (result && result.id && managerId) {
      _notifyManagerAssigned(result.id, managerId).catch(() => {});
    }
    return result;
  } catch (error) {
    console.error('Team Service - createTeam error:', error);
    throw error;
  }
};

/**
 * Update a team's name/description (and optionally org/manager).
 * Pass null for organizationId/managerId to leave unchanged. Org-scoped.
 */
const updateTeam = async (
  teamId,
  name,
  description,
  organizationId = null,
  managerId = null,
  callerUuid,
  roleId
) => {
  try {
    const existingTeam = await _assertCallerCanAccessTeam(callerUuid, roleId, teamId);
    const previousManagerId = existingTeam.manager_id || null;

    const [rows] = await pool.query(
      'CALL sp_update_team(?, ?, ?, ?, ?)',
      [teamId, name, description, organizationId, managerId]
    );
    const result = rows[0]?.[0] || { affectedRows: 0 };

    if (managerId && managerId !== previousManagerId) {
      _notifyManagerAssigned(teamId, managerId).catch(() => {});
    }
    return result;
  } catch (error) {
    console.error('Team Service - updateTeam error:', error);
    throw error;
  }
};

/**
 * Swap or set a team's manager. Validates:
 *   1. The caller has access to the team (org membership or team creator).
 *   2. The new manager is a member of the team's organization.
 */
const setTeamManager = async (teamId, managerId, callerUuid, roleId) => {
  try {
    const team = await _assertCallerCanAccessTeam(callerUuid, roleId, teamId);

    if (managerId && team.organization_id) {
      const [memberRows] = await pool.query(
        'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
        [managerId, team.organization_id]
      );
      if (memberRows.length === 0) {
        throw _httpError(400, 'Manager must be a member of the team\'s organization');
      }
    }

    const [result] = await pool.query(
      'UPDATE teams SET manager_id = ? WHERE id = ? AND is_deleted = 0',
      [managerId, teamId]
    );

    if (result.affectedRows > 0 && managerId && managerId !== team.manager_id) {
      _notifyManagerAssigned(teamId, managerId).catch(() => {});
    }
    return { affectedRows: result.affectedRows };
  } catch (error) {
    console.error('Team Service - setTeamManager error:', error);
    throw error;
  }
};

/**
 * Delete a team (soft delete). Org-scoped.
 */
const deleteTeam = async (teamId, callerUuid, roleId) => {
  try {
    await _assertCallerCanAccessTeam(callerUuid, roleId, teamId);
    const [rows] = await pool.query('CALL sp_delete_team(?)', [teamId]);
    return rows[0]?.[0] || { affectedRows: 0 };
  } catch (error) {
    console.error('Team Service - deleteTeam error:', error);
    throw error;
  }
};

/**
 * Build the WHERE-fragment that scopes a query to teams in the caller's orgs.
 * Returns { sql, params }. For super-admin returns an empty fragment.
 *
 * `tableAlias.organization_id` is the column being scoped.
 */
const _orgScopeFragment = (callerUuid, roleId, tableAlias = 't') => {
  if (roleId === ROLE_SUPER_ADMIN) {
    return { sql: '', params: [] };
  }
  // Two ways a non-super-admin caller can see a team:
  //   1. They share an org with it via user_organizations, OR
  //   2. They are the team's manager directly (team.manager_id = caller's uuid).
  // The second branch is critical for a learner-as-manager who isn't in
  // user_organizations of the team's org (e.g. cross-org assignment).
  return {
    sql: ` AND (
             ${tableAlias}.organization_id IN (
               SELECT organization_id FROM user_organizations WHERE user_id = ?
             )
             OR ${tableAlias}.manager_id = ?
           )`,
    params: [callerUuid, callerUuid]
  };
};

/**
 * Get team stats for dashboard. Org-scoped: counts only members/learners
 * inside teams the caller can see. Super-admin: system-wide.
 */
const getTeamStats = async (callerUuid, roleId) => {
  try {
    const scope = _orgScopeFragment(callerUuid, roleId, 't');

    const [memberRows] = await pool.query(
      `SELECT COUNT(DISTINCT tm.user_id) AS total_members
         FROM team_members tm
         INNER JOIN teams t ON tm.team_id = t.id
         WHERE t.is_deleted = 0${scope.sql}`,
      scope.params
    );
    const totalMembers = memberRows[0]?.total_members || 0;

    const [learnerRows] = await pool.query(
      `SELECT COUNT(DISTINCT e.user_id) AS active_learners
         FROM enrol e
         INNER JOIN team_members tm ON e.user_id = tm.user_id
         INNER JOIN teams t ON tm.team_id = t.id
         WHERE t.is_deleted = 0${scope.sql}`,
      scope.params
    );
    const activeLearners = learnerRows[0]?.active_learners || 0;

    // Completion-rate aggregate over course_progress for users who are in
    // (any of) the in-scope teams. For super-admin, fall back to the
    // unscoped global rate.
    let completionRate = 0;
    if (roleId === ROLE_SUPER_ADMIN) {
      const [globalRate] = await pool.query(
        `SELECT ROUND(
            COALESCE(
              (SELECT COUNT(*) FROM course_progress WHERE lesson_completed = 1) * 100.0 /
              NULLIF((SELECT COUNT(*) FROM course_progress), 0),
              0
            ), 0
          ) AS rate`
      );
      completionRate = globalRate[0]?.rate || 0;
    } else {
      const [scopedRate] = await pool.query(
        `SELECT ROUND(
            COALESCE(
              SUM(cp.lesson_completed) * 100.0 / NULLIF(COUNT(*), 0),
              0
            ), 0
          ) AS rate
            FROM course_progress cp
            INNER JOIN enrol e ON cp.enroll_id = e.id
            INNER JOIN team_members tm ON e.user_id = tm.user_id
            INNER JOIN teams t ON tm.team_id = t.id
            WHERE t.is_deleted = 0${scope.sql}`,
        scope.params
      );
      completionRate = scopedRate[0]?.rate || 0;
    }

    return {
      totalMembers,
      activeMembers: totalMembers > 0 ? 'All active' : 'No members',
      activeLearners,
      activeLearnersStatus: 'Currently learning',
      completionRate: `${completionRate}%`,
      completionRateChange: '+5% this month',
      complianceRate: '100%',
      complianceIssue: '0 members overdue'
    };
  } catch (error) {
    console.error('Team Service - getTeamStats error:', error);
    throw error;
  }
};

/**
 * Get all team members with details. Org-scoped:
 *   - teamId given:    must pass `_assertCallerCanAccessTeam`.
 *   - teamId null:     filter to teams in caller's orgs.
 */
const getTeamMembers = async (teamId, callerUuid, roleId) => {
  try {
    if (teamId) {
      await _assertCallerCanAccessTeam(callerUuid, roleId, teamId);
    }
    const scope = _orgScopeFragment(callerUuid, roleId, 't');

    const [rows] = await pool.query(
      `SELECT
          u.uuid AS id,
          CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) AS name,
          u.email,
          COALESCE(sci.designation, 'Not assigned') AS jobTitle,
          COALESCE(sci.department, 'Unassigned') AS department,
          UPPER(CONCAT(LEFT(COALESCE(s.first_name, '-'), 1), LEFT(COALESCE(s.last_name, '-'), 1))) AS initials,
          COALESCE(progress.completion_rate, 0) AS progress,
          CONCAT(COALESCE(progress.completed_count, 0), '/', COALESCE(progress.total_enrolled, 0)) AS requiredTraining,
          COALESCE(DATE_FORMAT(tc_next.deadline, '%b %d, %Y'), 'None') AS nextDeadline,
          0 AS overdue,
          COALESCE(s.contact, 'Not provided') AS phone,
          COALESCE(sci.location, 'Not provided') AS location,
          COALESCE(sci.manager_name, 'Not assigned') AS manager,
          DATE_FORMAT(u.created_at, '%Y-%m-%d') AS joinDate,
          CASE
            WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 1 THEN 'Just now'
            WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, u.updated_at, NOW()), ' hours ago')
            ELSE CONCAT(TIMESTAMPDIFF(DAY, u.updated_at, NOW()), ' days ago')
          END AS lastLogin,
          COALESCE(progress.completed_count, 0) AS completedCourses,
          COALESCE(progress.in_progress_count, 0) AS inProgressCourses
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.uuid
        INNER JOIN teams t ON tm.team_id = t.id
        LEFT JOIN students s ON u.uuid = s.user_id
        LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
        LEFT JOIN (
          SELECT
            e.user_id,
            COUNT(DISTINCT e.id) AS total_enrolled,
            COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) AS completed_count,
            COUNT(DISTINCT CASE WHEN COALESCE(course_complete.is_complete, 0) = 0 THEN e.id END) AS in_progress_count,
            ROUND(
              COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) * 100.0 /
              NULLIF(COUNT(DISTINCT e.id), 0),
              0
            ) AS completion_rate
          FROM enrol e
          LEFT JOIN (
            SELECT cp.enroll_id,
              CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END AS is_complete
            FROM course_progress cp GROUP BY cp.enroll_id
          ) course_complete ON e.id = course_complete.enroll_id
          GROUP BY e.user_id
        ) progress ON u.uuid = progress.user_id
        LEFT JOIN (
          SELECT tc.team_id, tc.deadline FROM team_courses tc
          WHERE tc.deadline >= CURDATE() ORDER BY tc.deadline ASC LIMIT 1
        ) tc_next ON tm.team_id = tc_next.team_id
        WHERE t.is_deleted = 0
          AND (? IS NULL OR tm.team_id = ?)
          ${scope.sql}
        ORDER BY s.first_name, s.last_name`,
      [teamId, teamId, ...scope.params]
    );
    return rows;
  } catch (error) {
    console.error('Team Service - getTeamMembers error:', error);
    throw error;
  }
};

/**
 * Get team learning history. Org-scoped same way as getTeamMembers.
 */
const getLearningHistory = async (teamId, userId, status, callerUuid, roleId) => {
  try {
    if (teamId) {
      await _assertCallerCanAccessTeam(callerUuid, roleId, teamId);
    }
    const scope = _orgScopeFragment(callerUuid, roleId, 't');

    const [rows] = await pool.query(
      `SELECT
          e.id AS id,
          c.title AS name,
          COALESCE(cat.category_name, 'General') AS type,
          CASE
            WHEN course_complete.is_complete = 1 THEN 'Completed'
            WHEN course_complete.lessons_done > 0 THEN 'In Progress'
            ELSE 'Not Started'
          END AS status,
          COALESCE(ROUND(course_complete.lessons_done * 100.0 / NULLIF(course_complete.total_lessons, 0), 0), 0) AS progress,
          CASE WHEN course_complete.is_complete = 1 THEN '-' ELSE '-' END AS score,
          DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') AS enrolled,
          CASE
            WHEN course_complete.is_complete = 1 THEN DATE_FORMAT(e.last_updated, '%Y-%m-%d')
            ELSE 'In progress'
          END AS completed,
          CASE WHEN course_complete.is_complete = 1 THEN 1 ELSE 0 END AS certificate
        FROM team_members tm
        INNER JOIN teams t ON tm.team_id = t.id
        INNER JOIN enrol e ON tm.user_id = e.user_id
        INNER JOIN course c ON e.course_id = c.id
        LEFT JOIN category cat ON c.category_id = cat.id
        LEFT JOIN (
          SELECT cp.enroll_id,
            SUM(cp.lesson_completed) AS lessons_done,
            COUNT(*) AS total_lessons,
            CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END AS is_complete
          FROM course_progress cp GROUP BY cp.enroll_id
        ) course_complete ON e.id = course_complete.enroll_id
        WHERE t.is_deleted = 0 AND c.is_deleted = 0
          AND (? IS NULL OR tm.team_id = ?)
          AND (? IS NULL OR tm.user_id = ?)
          AND (? IS NULL OR ? = '' OR
               (? = 'completed' AND course_complete.is_complete = 1) OR
               (? = 'in_progress' AND course_complete.lessons_done > 0 AND course_complete.is_complete = 0) OR
               (? = 'not_started' AND (course_complete.lessons_done IS NULL OR course_complete.lessons_done = 0)))
          ${scope.sql}
        ORDER BY e.enrolled_date DESC`,
      [teamId, teamId, userId, userId, status, status, status, status, status, ...scope.params]
    );
    return rows;
  } catch (error) {
    console.error('Team Service - getLearningHistory error:', error);
    throw error;
  }
};

/**
 * Get students who can be added to a team. Org-scoped: only shows students
 * who belong to one of the caller's organizations.
 */
const getAvailableUsers = async (callerUuid, roleId) => {
  try {
    if (roleId === ROLE_SUPER_ADMIN) {
      const [rows] = await pool.query(
        `SELECT
            u.uuid AS id,
            CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) AS name,
            u.email,
            COALESCE(sci.department, 'Unassigned') AS department,
            COALESCE(sci.designation, 'Not assigned') AS jobTitle
          FROM users u
          INNER JOIN students s ON u.uuid = s.user_id
          LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
          LEFT JOIN team_members tm ON u.uuid = tm.user_id
          WHERE u.is_deleted = 0 AND u.role_id = 1 AND tm.id IS NULL
          ORDER BY s.first_name, s.last_name`
      );
      return rows;
    }

    const [rows] = await pool.query(
      `SELECT
          u.uuid AS id,
          CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) AS name,
          u.email,
          COALESCE(sci.department, 'Unassigned') AS department,
          COALESCE(sci.designation, 'Not assigned') AS jobTitle
        FROM users u
        INNER JOIN students s ON u.uuid = s.user_id
        INNER JOIN user_organizations uo ON u.uuid = uo.user_id
        LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
        LEFT JOIN team_members tm ON u.uuid = tm.user_id
        WHERE u.is_deleted = 0
          AND u.role_id = 1
          AND tm.id IS NULL
          AND uo.organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = ?
          )
        GROUP BY u.uuid
        ORDER BY s.first_name, s.last_name`,
      [callerUuid]
    );
    return rows;
  } catch (error) {
    console.error('Team Service - getAvailableUsers error:', error);
    throw error;
  }
};

/**
 * Get available courses for assignment. NOT org-scoped: the course catalog
 * is intentionally global in this schema (no `course_organizations` table).
 * If course org-scoping is added in the future, gate it here.
 */
const getAvailableCourses = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_available_courses()');
    return rows[0] || [];
  } catch (error) {
    console.error('Team Service - getAvailableCourses error:', error);
    throw error;
  }
};

/**
 * Add members to a team
 * @param {number} teamId - Team ID
 * @param {Array<string>} userIds - Array of user IDs to add
 * @param {string} addedBy - User ID who added the members
 * @returns {Promise<Object>} Result with added count
 */
const addTeamMembers = async (teamId, userIds, addedBy) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let addedCount = 0;
    for (const userId of userIds) {
      try {
        await connection.query(
          'INSERT INTO team_members (team_id, user_id, added_by) VALUES (?, ?, ?)',
          [teamId, userId, addedBy]
        );
        addedCount++;
      } catch (err) {
        // Ignore duplicate key errors
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }

    await connection.commit();
    return { addedCount };
  } catch (error) {
    await connection.rollback();
    console.error('Team Service - addTeamMembers error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Remove a member from a team
 * @param {number} teamId - Team ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<Object>} Affected rows
 */
const removeTeamMember = async (teamId, userId) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );
    return { affectedRows: result.affectedRows };
  } catch (error) {
    console.error('Team Service - removeTeamMember error:', error);
    throw error;
  }
};

/**
 * Assign courses to a team (and auto-enroll all team members)
 * @param {number} teamId - Team ID
 * @param {Array<Object>} courses - Array of { courseId, deadline }
 * @param {string} assignedBy - User ID who assigned the courses
 * @returns {Promise<Object>} Result with counts
 */
const assignCoursesToTeam = async (teamId, courses, assignedBy) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let assignedCourses = 0;
    let enrolledUsers = 0;

    // Get all team members
    const [members] = await connection.query(
      'SELECT user_id FROM team_members WHERE team_id = ?',
      [teamId]
    );

    for (const course of courses) {
      try {
        // Add to team_courses
        await connection.query(
          'INSERT INTO team_courses (team_id, course_id, assigned_by, deadline) VALUES (?, ?, ?, ?)',
          [teamId, course.courseId, assignedBy, course.deadline || null]
        );
        assignedCourses++;

        // Auto-enroll all team members
        for (const member of members) {
          try {
            await connection.query(
              'INSERT INTO enrol (user_id, course_id) VALUES (?, ?)',
              [member.user_id, course.courseId]
            );
            enrolledUsers++;
          } catch (err) {
            // Ignore duplicate enrollment errors
            if (err.code !== 'ER_DUP_ENTRY') throw err;
          }
        }
      } catch (err) {
        // Ignore duplicate team_course entries
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }

    await connection.commit();
    return { assignedCourses, enrolledUsers };
  } catch (error) {
    await connection.rollback();
    console.error('Team Service - assignCoursesToTeam error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Bulk enroll users in courses
const bulkEnrollUsers = async (userIds, courseIds, deadline = null) => {
  try {
    const [result] = await pool.query(
      'CALL sp_bulk_enroll_users(?, ?, ?)',
      [JSON.stringify(userIds), JSON.stringify(courseIds), deadline]
    );
    return result[0][0];
  } catch (error) {
    console.error('Team Service - bulkEnrollUsers error:', error);
    throw error;
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  setTeamManager,
  deleteTeam,
  getTeamStats,
  getTeamMembers,
  getLearningHistory,
  getAvailableUsers,
  getAvailableCourses,
  addTeamMembers,
  removeTeamMember,
  assignCoursesToTeam,
  bulkEnrollUsers
};
