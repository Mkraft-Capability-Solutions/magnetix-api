const express = require('express');
const router = express.Router();
const teamController = require('../../controllers/instructor/team_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication and instructor authorization to all routes
router.use(authenticate);
router.use(authorize(2)); // Role 2 = Instructor

/**
 * GET /api/instructor/teams/stats
 * Get team dashboard stats for instructor
 */
router.get('/stats', teamController.getTeamStats);

/**
 * GET /api/instructor/teams/members
 * Get all team members for instructor's teams
 * Query params: teamId (optional)
 */
router.get('/members', teamController.getTeamMembers);

/**
 * GET /api/instructor/teams/learning-history
 * Get team learning history for instructor's teams
 * Query params: teamId, userId, status (all optional)
 */
router.get('/learning-history', teamController.getLearningHistory);

/**
 * GET /api/instructor/teams/available-users
 * Get users not in instructor's teams
 */
router.get('/available-users', teamController.getAvailableUsers);

/**
 * GET /api/instructor/teams/available-courses
 * Get instructor's courses available for assignment
 */
router.get('/available-courses', teamController.getAvailableCourses);

/**
 * POST /api/instructor/teams/bulk-enroll
 * Bulk enroll users in instructor's courses
 * Body: { userIds: string[], courseIds: string[], deadline?: string }
 */
router.post('/bulk-enroll', teamController.bulkEnrollUsers);

/**
 * GET /api/instructor/teams
 * Get all teams created by instructor
 */
router.get('/', teamController.getAllTeams);

/**
 * GET /api/instructor/teams/:id
 * Get team by ID (only if created by instructor)
 */
router.get('/:id', teamController.getTeamById);

/**
 * POST /api/instructor/teams
 * Create a new team
 * Body: { name, description }
 */
router.post('/', teamController.createTeam);

/**
 * PUT /api/instructor/teams/:id
 * Update a team (only if created by instructor)
 * Body: { name, description }
 */
router.put('/:id', teamController.updateTeam);

/**
 * DELETE /api/instructor/teams/:id
 * Delete a team (only if created by instructor)
 */
router.delete('/:id', teamController.deleteTeam);

/**
 * POST /api/instructor/teams/:id/members
 * Add members to a team (only if created by instructor)
 * Body: { userIds: string[] }
 */
router.post('/:id/members', teamController.addTeamMembers);

/**
 * DELETE /api/instructor/teams/:id/members/:userId
 * Remove a member from a team (only if created by instructor)
 */
router.delete('/:id/members/:userId', teamController.removeTeamMember);

/**
 * POST /api/instructor/teams/:id/assign-courses
 * Assign instructor's courses to a team
 * Body: { courses: [{ courseId, deadline }] }
 */
router.post('/:id/assign-courses', teamController.assignCourses);

module.exports = router;
