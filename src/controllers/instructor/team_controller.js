const teamService = require('../../services/instructor/team_service');

/**
 * Instructor Team Controller
 * Handles all HTTP requests for instructor team endpoints
 * All endpoints filter data by instructor's teams only
 */

/**
 * Get all teams created by instructor
 * GET /api/instructor/teams
 */
exports.getAllTeams = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await teamService.getAllTeams(instructorId);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Team Controller - getAllTeams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams',
      error: error.message
    });
  }
};

/**
 * Get team by ID (only if created by instructor)
 * GET /api/instructor/teams/:id
 */
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await teamService.getTeamById(id, instructorId);

    if (!data.team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found or access denied'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Team Controller - getTeamById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team',
      error: error.message
    });
  }
};

/**
 * Create a new team
 * POST /api/instructor/teams
 */
exports.createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const result = await teamService.createTeam(name, description, instructorId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Team created successfully'
    });
  } catch (error) {
    console.error('Instructor Team Controller - createTeam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
};

/**
 * Update a team (only if created by instructor)
 * PUT /api/instructor/teams/:id
 */
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const result = await teamService.updateTeam(id, name, description, instructorId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Team updated successfully'
    });
  } catch (error) {
    console.error('Instructor Team Controller - updateTeam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team',
      error: error.message
    });
  }
};

/**
 * Delete a team (only if created by instructor)
 * DELETE /api/instructor/teams/:id
 */
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const result = await teamService.deleteTeam(id, instructorId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Instructor Team Controller - deleteTeam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team',
      error: error.message
    });
  }
};

/**
 * Get team stats for instructor's dashboard
 * GET /api/instructor/teams/stats
 */
exports.getTeamStats = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await teamService.getTeamStats(instructorId);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Team Controller - getTeamStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team stats',
      error: error.message
    });
  }
};

/**
 * Get all team members for instructor's teams
 * GET /api/instructor/teams/members
 */
exports.getTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await teamService.getTeamMembers(instructorId, teamId || null);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Team Controller - getTeamMembers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
};

/**
 * Get team learning history for instructor's teams
 * GET /api/instructor/teams/learning-history
 */
exports.getLearningHistory = async (req, res) => {
  try {
    const { teamId, userId, status } = req.query;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await teamService.getLearningHistory(
      instructorId,
      teamId || null,
      userId || null,
      status || null
    );
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Team Controller - getLearningHistory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning history',
      error: error.message
    });
  }
};

/**
 * Get available users (students not in instructor's teams)
 * GET /api/instructor/teams/available-users
 */
exports.getAvailableUsers = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await teamService.getAvailableUsers(instructorId);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Team Controller - getAvailableUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available users',
      error: error.message
    });
  }
};

/**
 * Get available courses for assignment (instructor's courses only)
 * GET /api/instructor/teams/available-courses
 */
exports.getAvailableCourses = async (req, res) => {
  try {
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const data = await teamService.getAvailableCourses(instructorId);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Instructor Team Controller - getAvailableCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available courses',
      error: error.message
    });
  }
};

/**
 * Add members to a team (only if team created by instructor)
 * POST /api/instructor/teams/:id/members
 */
exports.addTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    const result = await teamService.addTeamMembers(id, userIds, instructorId);

    res.json({
      success: true,
      data: result,
      message: `${result.addedCount} member(s) added successfully`
    });
  } catch (error) {
    console.error('Instructor Team Controller - addTeamMembers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team members',
      error: error.message
    });
  }
};

/**
 * Remove a member from a team (only if team created by instructor)
 * DELETE /api/instructor/teams/:id/members/:userId
 */
exports.removeTeamMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const result = await teamService.removeTeamMember(id, userId, instructorId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Instructor Team Controller - removeTeamMember error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member',
      error: error.message
    });
  }
};

/**
 * Assign courses to a team (only instructor's courses)
 * POST /api/instructor/teams/:id/assign-courses
 */
exports.assignCourses = async (req, res) => {
  try {
    const { id } = req.params;
    const { courses } = req.body;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Courses array is required'
      });
    }

    const result = await teamService.assignCoursesToTeam(id, courses, instructorId);

    res.json({
      success: true,
      data: result,
      message: `${result.assignedCourses} course(s) assigned and ${result.enrolledUsers} enrollment(s) created`
    });
  } catch (error) {
    console.error('Instructor Team Controller - assignCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign courses',
      error: error.message
    });
  }
};

/**
 * Bulk enroll users in courses (only instructor's courses)
 * POST /api/instructor/teams/bulk-enroll
 */
exports.bulkEnrollUsers = async (req, res) => {
  try {
    const { userIds, courseIds, deadline } = req.body;
    const instructorId = req.user?.uuid;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

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

    const result = await teamService.bulkEnrollUsers(userIds, courseIds, instructorId, deadline);

    res.json({
      success: true,
      data: result,
      message: `${result.enrolledCount} enrollment(s) created for ${result.userCount} user(s) in ${result.courseCount} course(s)`
    });
  } catch (error) {
    console.error('Instructor Team Controller - bulkEnrollUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll users',
      error: error.message
    });
  }
};
