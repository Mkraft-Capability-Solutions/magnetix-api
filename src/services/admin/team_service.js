const { promisePool: pool } = require('../../config/db');
const emailHelper = require('../../utils/email_helper');
const notificationService = require('../../services/notification_service');

/**
 * Admin Team Service
 * Handles all business logic for team management
 */

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
 * Get all teams with member count
 * @returns {Promise<Array>} Array of teams
 */
const getAllTeams = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_all_teams()');
    return rows[0] || [];
  } catch (error) {
    console.error('Team Service - getAllTeams error:', error);
    throw error;
  }
};

/**
 * Get team by ID with members
 * @param {number} teamId - Team ID
 * @returns {Promise<Object>} Team with members
 */
const getTeamById = async (teamId) => {
  try {
    const [rows] = await pool.query('CALL sp_get_team_by_id(?)', [teamId]);
    const team = rows[0]?.[0] || null;
    const members = rows[1] || [];
    return { team, members };
  } catch (error) {
    console.error('Team Service - getTeamById error:', error);
    throw error;
  }
};

/**
 * Create a new team. organizationId/managerId are optional.
 */
const createTeam = async (name, description, createdBy, organizationId = null, managerId = null) => {
  try {
    if (managerId && organizationId) {
      const [memberRows] = await pool.query(
        'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
        [managerId, organizationId]
      );
      if (memberRows.length === 0) {
        throw new Error('Manager must be a member of the team\'s organization');
      }
    }

    const [rows] = await pool.query(
      'CALL sp_create_team(?, ?, ?, ?, ?)',
      [name, description, createdBy, organizationId, managerId]
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
 * Pass null for organizationId/managerId to leave unchanged.
 */
const updateTeam = async (teamId, name, description, organizationId = null, managerId = null) => {
  try {
    let previousManagerId = null;
    if (managerId !== null) {
      const [prevRows] = await pool.query('SELECT manager_id FROM teams WHERE id = ?', [teamId]);
      previousManagerId = (prevRows[0] && prevRows[0].manager_id) || null;
    }

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
 * Swap or set a team's manager. Validates manager belongs to the team's org.
 */
const setTeamManager = async (teamId, managerId) => {
  try {
    const [teamRows] = await pool.query(
      'SELECT id, organization_id, manager_id FROM teams WHERE id = ? AND is_deleted = 0',
      [teamId]
    );
    if (teamRows.length === 0) {
      return { affectedRows: 0, message: 'Team not found' };
    }
    const team = teamRows[0];

    if (managerId && team.organization_id) {
      const [memberRows] = await pool.query(
        'SELECT 1 FROM user_organizations WHERE user_id = ? AND organization_id = ? LIMIT 1',
        [managerId, team.organization_id]
      );
      if (memberRows.length === 0) {
        const err = new Error('Manager must be a member of the team\'s organization');
        err.statusCode = 400;
        throw err;
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
 * Delete a team (soft delete)
 * @param {number} teamId - Team ID
 * @returns {Promise<Object>} Affected rows
 */
const deleteTeam = async (teamId) => {
  try {
    const [rows] = await pool.query('CALL sp_delete_team(?)', [teamId]);
    return rows[0]?.[0] || { affectedRows: 0 };
  } catch (error) {
    console.error('Team Service - deleteTeam error:', error);
    throw error;
  }
};

/**
 * Get team stats for dashboard
 * @returns {Promise<Object>} Team statistics
 */
const getTeamStats = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_team_stats()');
    return rows[0]?.[0] || null;
  } catch (error) {
    console.error('Team Service - getTeamStats error:', error);
    throw error;
  }
};

/**
 * Get all team members with details
 * @param {number} teamId - Optional team ID filter
 * @returns {Promise<Array>} Array of team members
 */
const getTeamMembers = async (teamId = null) => {
  try {
    const [rows] = await pool.query('CALL sp_get_team_members(?)', [teamId]);
    return rows[0] || [];
  } catch (error) {
    console.error('Team Service - getTeamMembers error:', error);
    throw error;
  }
};

/**
 * Get team learning history
 * @param {number} teamId - Optional team ID filter
 * @param {string} userId - Optional user ID filter
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of learning history items
 */
const getLearningHistory = async (teamId = null, userId = null, status = null) => {
  try {
    const [rows] = await pool.query('CALL sp_get_team_learning_history(?, ?, ?)', [teamId, userId, status]);
    return rows[0] || [];
  } catch (error) {
    console.error('Team Service - getLearningHistory error:', error);
    throw error;
  }
};

/**
 * Get available users (not in any team)
 * @returns {Promise<Array>} Array of available users
 */
const getAvailableUsers = async () => {
  try {
    const [rows] = await pool.query('CALL sp_get_available_users()');
    return rows[0] || [];
  } catch (error) {
    console.error('Team Service - getAvailableUsers error:', error);
    throw error;
  }
};

/**
 * Get available courses for assignment
 * @returns {Promise<Array>} Array of available courses
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
