const { promisePool: pool } = require('../../config/db');

/**
 * Admin Team Service
 * Handles all business logic for team management
 */

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
 * Create a new team
 * @param {string} name - Team name
 * @param {string} description - Team description
 * @param {string} createdBy - User ID who created the team
 * @returns {Promise<Object>} Created team ID
 */
const createTeam = async (name, description, createdBy) => {
  try {
    const [rows] = await pool.query('CALL sp_create_team(?, ?, ?)', [name, description, createdBy]);
    return rows[0]?.[0] || null;
  } catch (error) {
    console.error('Team Service - createTeam error:', error);
    throw error;
  }
};

/**
 * Update a team
 * @param {number} teamId - Team ID
 * @param {string} name - Team name
 * @param {string} description - Team description
 * @returns {Promise<Object>} Affected rows
 */
const updateTeam = async (teamId, name, description) => {
  try {
    const [rows] = await pool.query('CALL sp_update_team(?, ?, ?)', [teamId, name, description]);
    return rows[0]?.[0] || { affectedRows: 0 };
  } catch (error) {
    console.error('Team Service - updateTeam error:', error);
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
