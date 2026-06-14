const teamService = require('../../services/admin/team_service');

/**
 * Admin Team Controller
 * Handles all HTTP requests for admin team endpoints
 */

/**
 * Get all teams
 * GET /api/admin/teams
 */
exports.getAllTeams = async (req, res) => {
  try {
    const data = await teamService.getAllTeams(req.user.uuid, req.user.role_id);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Team Controller - getAllTeams error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch teams',
      error: error.message
    });
  }
};

/**
 * Get team by ID
 * GET /api/admin/teams/:id
 */
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await teamService.getTeamById(id, req.user.uuid, req.user.role_id);

    if (!data.team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Team Controller - getTeamById error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch team',
      error: error.message
    });
  }
};

/**
 * Create a new team
 * POST /api/admin/teams
 */
exports.createTeam = async (req, res) => {
  try {
    const { name, description, organizationId, managerId } = req.body;
    const createdBy = req.user.uuid;
    const roleId = req.user.role_id;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const result = await teamService.createTeam(
      name,
      description,
      createdBy,
      organizationId || null,
      managerId || null,
      roleId
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Team created successfully'
    });
  } catch (error) {
    console.error('Team Controller - createTeam error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create team',
      error: error.message
    });
  }
};

/**
 * Update a team
 * PUT /api/admin/teams/:id
 */
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, organizationId, managerId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const result = await teamService.updateTeam(
      id,
      name,
      description,
      organizationId === undefined ? null : organizationId,
      managerId === undefined ? null : managerId,
      req.user.uuid,
      req.user.role_id
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      message: 'Team updated successfully'
    });
  } catch (error) {
    console.error('Team Controller - updateTeam error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update team',
      error: error.message
    });
  }
};

/**
 * Set or change a team's manager
 * PATCH /api/admin/teams/:id/manager
 */
exports.setTeamManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { managerId } = req.body;

    if (managerId !== null && (typeof managerId !== 'string' || managerId.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'managerId must be a user UUID or null to clear'
      });
    }

    const result = await teamService.setTeamManager(
      id,
      managerId || null,
      req.user.uuid,
      req.user.role_id
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Team not found'
      });
    }

    res.json({
      success: true,
      message: managerId ? 'Team manager assigned' : 'Team manager cleared'
    });
  } catch (error) {
    console.error('Team Controller - setTeamManager error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to set team manager',
      error: error.message
    });
  }
};

/**
 * Delete a team
 * DELETE /api/admin/teams/:id
 */
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await teamService.deleteTeam(id, req.user.uuid, req.user.role_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Team Controller - deleteTeam error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete team',
      error: error.message
    });
  }
};

/**
 * Get team stats for dashboard
 * GET /api/admin/teams/stats
 */
exports.getTeamStats = async (req, res) => {
  try {
    const data = await teamService.getTeamStats(req.user.uuid, req.user.role_id);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Team Controller - getTeamStats error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch team stats',
      error: error.message
    });
  }
};

/**
 * Get all team members
 * GET /api/admin/teams/members
 */
exports.getTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.query;
    const data = await teamService.getTeamMembers(
      teamId || null,
      req.user.uuid,
      req.user.role_id
    );
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Team Controller - getTeamMembers error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch team members',
      error: error.message
    });
  }
};

/**
 * Get team learning history
 * GET /api/admin/teams/learning-history
 */
exports.getLearningHistory = async (req, res) => {
  try {
    const { teamId, userId, status } = req.query;
    const data = await teamService.getLearningHistory(
      teamId || null,
      userId || null,
      status || null,
      req.user.uuid,
      req.user.role_id
    );
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Team Controller - getLearningHistory error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch learning history',
      error: error.message
    });
  }
};

/**
 * Get available users for adding to a team.
 * GET /api/admin/teams/available-users?excludeTeamId=:id
 *
 * When excludeTeamId is supplied, returns users NOT already on that specific
 * team (so the same learner can be added to multiple teams). With no param,
 * keeps the legacy "not on any team" behaviour for back-compat.
 */
exports.getAvailableUsers = async (req, res) => {
  try {
    const excludeTeamIdRaw = req.query.excludeTeamId;
    const excludeTeamId = excludeTeamIdRaw ? parseInt(excludeTeamIdRaw, 10) : null;
    const data = await teamService.getAvailableUsers(
      req.user.uuid,
      req.user.role_id,
      Number.isFinite(excludeTeamId) ? excludeTeamId : null
    );
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Team Controller - getAvailableUsers error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch available users',
      error: error.message
    });
  }
};

/**
 * Get available courses for assignment
 * GET /api/admin/teams/available-courses
 */
exports.getAvailableCourses = async (req, res) => {
  try {
    const data = await teamService.getAvailableCourses();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Team Controller - getAvailableCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available courses',
      error: error.message
    });
  }
};

/**
 * Add members to a team
 * POST /api/admin/teams/:id/members
 */
exports.addTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    const addedBy = req.user.uuid;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    const result = await teamService.addTeamMembers(id, userIds, addedBy);

    res.json({
      success: true,
      data: result,
      message: `${result.addedCount} member(s) added successfully`
    });
  } catch (error) {
    console.error('Team Controller - addTeamMembers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team members',
      error: error.message
    });
  }
};

/**
 * Remove a member from a team
 * DELETE /api/admin/teams/:id/members/:userId
 */
exports.removeTeamMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const result = await teamService.removeTeamMember(id, userId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Team Controller - removeTeamMember error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member',
      error: error.message
    });
  }
};

/**
 * Assign courses to a team
 * POST /api/admin/teams/:id/assign-courses
 */
exports.assignCourses = async (req, res) => {
  try {
    const { id } = req.params;
    const { courses } = req.body;
    const assignedBy = req.user.uuid;

    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Courses array is required'
      });
    }

    const result = await teamService.assignCoursesToTeam(id, courses, assignedBy);

    res.json({
      success: true,
      data: result,
      message: `${result.assignedCourses} course(s) assigned and ${result.enrolledUsers} enrollment(s) created`
    });
  } catch (error) {
    console.error('Team Controller - assignCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign courses',
      error: error.message
    });
  }
};

/**
 * Bulk enroll users in courses
 * POST /api/admin/teams/bulk-enroll
 */
exports.bulkEnrollUsers = async (req, res) => {
  try {
    const { userIds, courseIds, deadline } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course IDs array is required'
      });
    }

    const result = await teamService.bulkEnrollUsers(userIds, courseIds, deadline);

    res.json({
      success: true,
      data: result,
      message: `${result.enrolledCount} enrollment(s) created for ${result.userCount} user(s) in ${result.courseCount} course(s)`
    });
  } catch (error) {
    console.error('Team Controller - bulkEnrollUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll users',
      error: error.message
    });
  }
};
