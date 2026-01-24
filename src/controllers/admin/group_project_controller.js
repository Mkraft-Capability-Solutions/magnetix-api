const GroupProjectService = require("../../services/admin/group_project_service");
const Joi = require("joi");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const projectSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(255),
  description: Joi.string().allow("", null).optional(),
  status: Joi.string().valid('draft', 'active', 'completed', 'archived').optional(),
  maxTeams: Joi.number().integer().min(1).required(),
  membersPerTeam: Joi.number().integer().min(1).required(),
  deadline: Joi.date().allow(null).optional(),
  startDate: Joi.date().allow(null).optional(),
  instructions: Joi.string().allow("", null).optional(),
  gradingCriteria: Joi.string().allow("", null).optional(),
  totalPoints: Joi.number().integer().min(0).optional()
});

const teamSchema = Joi.object({
  teamName: Joi.string().required().trim().min(1).max(255),
  teamNumber: Joi.number().integer().min(1).required(),
  description: Joi.string().allow("", null).optional()
});

const deliverableSchema = Joi.object({
  title: Joi.string().required().trim().min(1).max(255),
  displayOrder: Joi.number().integer().min(0).optional()
});

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Get all projects with optional filters
 * GET /api/admin/group-projects
 * Query params: status, search
 */
exports.getProjects = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status || null,
      search: req.query.search || null
    };

    const projects = await GroupProjectService.getProjects(filters);

    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error("Error in getProjects:", error);
    next(error);
  }
};

/**
 * Get project by ID
 * GET /api/admin/group-projects/:projectId
 */
exports.getProjectById = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const project = await GroupProjectService.getProjectById(projectId);

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in getProjectById:", error);
    next(error);
  }
};

/**
 * Create a new project
 * POST /api/admin/group-projects
 */
exports.createProject = async (req, res, next) => {
  try {
    const { error, value } = projectSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message)
      });
    }

    const createdBy = req.user.uuid;
    const project = await GroupProjectService.createProject(value, createdBy);

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project
    });
  } catch (error) {
    console.error("Error in createProject:", error);
    next(error);
  }
};

/**
 * Update a project
 * PUT /api/admin/group-projects/:projectId
 */
exports.updateProject = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const updatedBy = req.user.uuid;
    const project = await GroupProjectService.updateProject(projectId, req.body, updatedBy);

    res.json({
      success: true,
      message: "Project updated successfully",
      data: project
    });
  } catch (error) {
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in updateProject:", error);
    next(error);
  }
};

/**
 * Delete a project (soft delete)
 * DELETE /api/admin/group-projects/:projectId
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const result = await GroupProjectService.deleteProject(projectId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in deleteProject:", error);
    next(error);
  }
};

// ============================================================================
// TEAM OPERATIONS
// ============================================================================

/**
 * Get teams for a project
 * GET /api/admin/group-projects/:projectId/teams
 */
exports.getTeams = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const teams = await GroupProjectService.getTeams(projectId);

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error("Error in getTeams:", error);
    next(error);
  }
};

/**
 * Create a team
 * POST /api/admin/group-projects/:projectId/teams
 */
exports.createTeam = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const { error, value } = teamSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message)
      });
    }

    const createdBy = req.user.uuid;
    const team = await GroupProjectService.createTeam(projectId, value, createdBy);

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: team
    });
  } catch (error) {
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message === "Team number already exists for this project" ||
        error.message === "Maximum teams limit reached for this project") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in createTeam:", error);
    next(error);
  }
};

/**
 * Update a team
 * PUT /api/admin/group-projects/teams/:teamId
 */
exports.updateTeam = async (req, res, next) => {
  try {
    const teamId = parseInt(req.params.teamId);

    if (isNaN(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID"
      });
    }

    const team = await GroupProjectService.updateTeam(teamId, req.body);

    res.json({
      success: true,
      message: "Team updated successfully",
      data: team
    });
  } catch (error) {
    if (error.message === "Team not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in updateTeam:", error);
    next(error);
  }
};

/**
 * Delete a team (soft delete)
 * DELETE /api/admin/group-projects/teams/:teamId
 */
exports.deleteTeam = async (req, res, next) => {
  try {
    const teamId = parseInt(req.params.teamId);

    if (isNaN(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID"
      });
    }

    const result = await GroupProjectService.deleteTeam(teamId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    if (error.message === "Team not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in deleteTeam:", error);
    next(error);
  }
};

/**
 * Add member to team
 * POST /api/admin/group-projects/teams/:teamId/members
 * Body: { userId: string, role?: string }
 */
exports.addTeamMember = async (req, res, next) => {
  try {
    const teamId = parseInt(req.params.teamId);

    if (isNaN(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID"
      });
    }

    const { userId, role = 'member' } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const member = await GroupProjectService.addTeamMember(teamId, userId, role);

    res.status(201).json({
      success: true,
      message: "Team member added successfully",
      data: member
    });
  } catch (error) {
    if (error.message === "Team not found" ||
        error.message === "User is already a member of this team" ||
        error.message === "User is already assigned to another team in this project" ||
        error.message === "Team is already full") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in addTeamMember:", error);
    next(error);
  }
};

/**
 * Remove member from team
 * DELETE /api/admin/group-projects/team-members/:memberId
 */
exports.removeTeamMember = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);

    if (isNaN(memberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID"
      });
    }

    const result = await GroupProjectService.removeTeamMember(memberId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    if (error.message === "Team member not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in removeTeamMember:", error);
    next(error);
  }
};

// ============================================================================
// SUBMISSION OPERATIONS
// ============================================================================

/**
 * Get submissions for a project
 * GET /api/admin/group-projects/:projectId/submissions
 * Query params: teamId, status
 */
exports.getSubmissions = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const filters = {
      teamId: req.query.teamId ? parseInt(req.query.teamId) : null,
      status: req.query.status || null
    };

    const submissions = await GroupProjectService.getSubmissions(projectId, filters);

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error("Error in getSubmissions:", error);
    next(error);
  }
};

/**
 * Submit work
 * POST /api/admin/group-projects/submissions
 */
exports.submitWork = async (req, res, next) => {
  try {
    const submittedBy = req.user.uuid;
    const submission = await GroupProjectService.submitWork(req.body, submittedBy);

    res.status(201).json({
      success: true,
      message: "Submission created successfully",
      data: submission
    });
  } catch (error) {
    if (error.message === "You are not a member of this team") {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in submitWork:", error);
    next(error);
  }
};

/**
 * Grade a submission
 * PATCH /api/admin/group-projects/submissions/:submissionId/grade
 * Body: { grade: number, feedback?: string, status?: string }
 */
exports.gradeSubmission = async (req, res, next) => {
  try {
    const submissionId = parseInt(req.params.submissionId);

    if (isNaN(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID"
      });
    }

    const gradedBy = req.user.uuid;
    const result = await GroupProjectService.gradeSubmission(submissionId, req.body, gradedBy);

    res.json({
      success: true,
      message: "Submission graded successfully",
      data: result
    });
  } catch (error) {
    if (error.message === "Submission not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in gradeSubmission:", error);
    next(error);
  }
};

/**
 * Delete a submission (soft delete)
 * DELETE /api/admin/group-projects/submissions/:submissionId
 */
exports.deleteSubmission = async (req, res, next) => {
  try {
    const submissionId = parseInt(req.params.submissionId);

    if (isNaN(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID"
      });
    }

    const result = await GroupProjectService.deleteSubmission(submissionId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    if (error.message === "Submission not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in deleteSubmission:", error);
    next(error);
  }
};

// ============================================================================
// DELIVERABLE OPERATIONS
// ============================================================================

/**
 * Get deliverables for a project
 * GET /api/admin/group-projects/:projectId/deliverables
 */
exports.getDeliverables = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const deliverables = await GroupProjectService.getDeliverables(projectId);

    res.json({
      success: true,
      data: deliverables
    });
  } catch (error) {
    console.error("Error in getDeliverables:", error);
    next(error);
  }
};

/**
 * Create a deliverable
 * POST /api/admin/group-projects/:projectId/deliverables
 */
exports.createDeliverable = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const { error, value } = deliverableSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message)
      });
    }

    const deliverable = await GroupProjectService.createDeliverable(projectId, value);

    res.status(201).json({
      success: true,
      message: "Deliverable created successfully",
      data: deliverable
    });
  } catch (error) {
    console.error("Error in createDeliverable:", error);
    next(error);
  }
};

/**
 * Update a deliverable
 * PUT /api/admin/group-projects/deliverables/:deliverableId
 */
exports.updateDeliverable = async (req, res, next) => {
  try {
    const deliverableId = parseInt(req.params.deliverableId);

    if (isNaN(deliverableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deliverable ID"
      });
    }

    const deliverable = await GroupProjectService.updateDeliverable(deliverableId, req.body);

    res.json({
      success: true,
      message: "Deliverable updated successfully",
      data: deliverable
    });
  } catch (error) {
    if (error.message === "Deliverable not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in updateDeliverable:", error);
    next(error);
  }
};

/**
 * Delete a deliverable (soft delete)
 * DELETE /api/admin/group-projects/deliverables/:deliverableId
 */
exports.deleteDeliverable = async (req, res, next) => {
  try {
    const deliverableId = parseInt(req.params.deliverableId);

    if (isNaN(deliverableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deliverable ID"
      });
    }

    const result = await GroupProjectService.deleteDeliverable(deliverableId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    if (error.message === "Deliverable not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    console.error("Error in deleteDeliverable:", error);
    next(error);
  }
};
