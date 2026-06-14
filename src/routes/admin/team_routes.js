const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/admin/team_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(3, 4)); // Role 3 = Admin, Role 4 = Super Admin

/**
 * GET /api/admin/teams/stats
 * Get team dashboard stats
 */
router.get('/stats', teamController.getTeamStats);

/**
 * GET /api/admin/teams/members
 * Get all team members with details
 * Query params: teamId (optional)
 */
router.get('/members', teamController.getTeamMembers);

/**
 * GET /api/admin/teams/learning-history
 * Get team learning history
 * Query params: teamId, userId, status (all optional)
 */
router.get('/learning-history', teamController.getLearningHistory);

/**
 * GET /api/admin/teams/available-users
 * Get users not in any team
 */
router.get('/available-users', teamController.getAvailableUsers);

/**
 * GET /api/admin/teams/available-courses
 * Get available courses for assignment
 */
router.get('/available-courses', teamController.getAvailableCourses);

/**
 * POST /api/admin/teams/bulk-enroll
 * Bulk enroll users in courses
 * Body: { userIds: string[], courseIds: string[], deadline?: string }
 */
router.post('/bulk-enroll', teamController.bulkEnrollUsers);

/**
 * GET /api/admin/teams
 * Get all teams with member count
 */
router.get('/', teamController.getAllTeams);

/**
 * GET /api/admin/teams/:id
 * Get team by ID with members
 */
router.get('/:id', teamController.getTeamById);

/**
 * POST /api/admin/teams
 * Create a new team
 * Body: { name, description }
 */
router.post('/', teamController.createTeam);

/**
 * PUT /api/admin/teams/:id
 * Update a team
 * Body: { name, description }
 */
router.put('/:id', teamController.updateTeam);

/**
 * DELETE /api/admin/teams/:id
 * Delete a team (soft delete)
 */
router.delete('/:id', teamController.deleteTeam);

/**
 * PATCH /api/admin/teams/:id/manager
 * Set or change a team's manager
 * Body: { managerId: string|null }
 */
router.patch('/:id/manager', teamController.setTeamManager);

/**
 * POST /api/admin/teams/:id/members
 * Add members to a team
 * Body: { userIds: string[] }
 */
router.post('/:id/members', teamController.addTeamMembers);

/**
 * DELETE /api/admin/teams/:id/members/:userId
 * Remove a member from a team
 */
router.delete('/:id/members/:userId', teamController.removeTeamMember);

/**
 * POST /api/admin/teams/:id/assign-courses
 * Assign courses to a team
 * Body: { courses: [{ courseId, deadline }] }
 */
router.post('/:id/assign-courses', teamController.assignCourses);

module.exports = router;
