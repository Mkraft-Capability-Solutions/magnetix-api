const express = require("express");
const router = express.Router();
const groupProjectController = require("../../controllers/admin/group_project_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(3)); // Role 3 = Admin

// ============================================================================
// PROJECT ROUTES
// ============================================================================

// Get all projects
router.get("/", groupProjectController.getProjects);

// Get project by ID
router.get("/:projectId", groupProjectController.getProjectById);

// Create new project
router.post("/", groupProjectController.createProject);

// Update project
router.put("/:projectId", groupProjectController.updateProject);

// Delete project
router.delete("/:projectId", groupProjectController.deleteProject);

// ============================================================================
// TEAM ROUTES
// ============================================================================

// Get teams for a project
router.get("/:projectId/teams", groupProjectController.getTeams);

// Create team
router.post("/:projectId/teams", groupProjectController.createTeam);

// Update team
router.put("/teams/:teamId", groupProjectController.updateTeam);

// Delete team
router.delete("/teams/:teamId", groupProjectController.deleteTeam);

// Add member to team
router.post("/teams/:teamId/members", groupProjectController.addTeamMember);

// Remove member from team
router.delete("/team-members/:memberId", groupProjectController.removeTeamMember);

// ============================================================================
// SUBMISSION ROUTES
// ============================================================================

// Get submissions for a project
router.get("/:projectId/submissions", groupProjectController.getSubmissions);

// Submit work
router.post("/submissions", groupProjectController.submitWork);

// Grade a submission
router.patch("/submissions/:submissionId/grade", groupProjectController.gradeSubmission);

// Delete submission
router.delete("/submissions/:submissionId", groupProjectController.deleteSubmission);

// ============================================================================
// DELIVERABLE ROUTES
// ============================================================================

// Get deliverables for a project
router.get("/:projectId/deliverables", groupProjectController.getDeliverables);

// Create deliverable
router.post("/:projectId/deliverables", groupProjectController.createDeliverable);

// Update deliverable
router.put("/deliverables/:deliverableId", groupProjectController.updateDeliverable);

// Delete deliverable
router.delete("/deliverables/:deliverableId", groupProjectController.deleteDeliverable);

module.exports = router;
