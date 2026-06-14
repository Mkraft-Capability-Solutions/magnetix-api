const { promisePool } = require("../../config/db");

class GroupProjectService {
  // ============================================================================
  // PROJECT CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all projects with optional filters
   */
  async getProjects(filters = {}) {
    try {
      const { status, search } = filters;

      let query = `
        SELECT
          gp.id,
          gp.name,
          gp.description,
          gp.status,
          gp.max_teams as maxTeams,
          gp.members_per_team as membersPerTeam,
          gp.deadline,
          gp.start_date as startDate,
          gp.instructions,
          gp.grading_criteria as gradingCriteria,
          gp.total_points as totalPoints,
          gp.created_by as createdBy,
          gp.created_date as createdDate,
          gp.last_updated as lastUpdated,
          (
            SELECT COUNT(*)
            FROM group_project_teams gpt
            WHERE gpt.project_id = gp.id AND gpt.is_deleted = 0
          ) as teams,
          (
            SELECT COUNT(*)
            FROM group_project_deliverables gpd
            WHERE gpd.project_id = gp.id AND gpd.is_deleted = 0
          ) as deliverables
        FROM group_projects gp
        WHERE gp.is_deleted = 0
      `;

      const params = [];

      // Apply status filter
      if (status) {
        query += ` AND gp.status = ?`;
        params.push(status);
      }

      // Apply search filter
      if (search) {
        query += ` AND (gp.name LIKE ? OR gp.description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY gp.created_date DESC`;

      const [projects] = await promisePool.query(query, params);

      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        maxTeams: project.maxTeams,
        membersPerTeam: project.membersPerTeam,
        teams: project.teams,
        deadline: project.deadline,
        startDate: project.startDate,
        instructions: project.instructions,
        gradingCriteria: project.gradingCriteria,
        totalPoints: project.totalPoints,
        deliverables: project.deliverables,
        createdBy: project.createdBy,
        createdDate: project.createdDate,
        lastUpdated: project.lastUpdated
      }));
    } catch (error) {
      console.error("Error in getProjects:", error);
      throw error;
    }
  }

  /**
   * Get project by ID with full details
   */
  async getProjectById(projectId) {
    try {
      const [projects] = await promisePool.query(`
        SELECT
          id,
          name,
          description,
          status,
          max_teams as maxTeams,
          members_per_team as membersPerTeam,
          deadline,
          start_date as startDate,
          instructions,
          grading_criteria as gradingCriteria,
          total_points as totalPoints,
          created_by as createdBy,
          created_date as createdDate,
          last_updated as lastUpdated
        FROM group_projects
        WHERE id = ? AND is_deleted = 0
      `, [projectId]);

      if (projects.length === 0) {
        throw new Error("Project not found");
      }

      const project = projects[0];

      // Get deliverables for this project
      const [deliverables] = await promisePool.query(`
        SELECT
          id,
          title,
          display_order as displayOrder
        FROM group_project_deliverables
        WHERE project_id = ? AND is_deleted = 0
        ORDER BY display_order ASC
      `, [projectId]);

      project.deliverables = deliverables;

      // Get teams for this project
      const [teams] = await promisePool.query(`
        SELECT
          id,
          team_name as teamName,
          team_number as teamNumber,
          description,
          created_date as createdDate
        FROM group_project_teams
        WHERE project_id = ? AND is_deleted = 0
        ORDER BY team_number ASC
      `, [projectId]);

      project.teams = teams;

      return project;
    } catch (error) {
      console.error("Error in getProjectById:", error);
      throw error;
    }
  }

  /**
   * Create a new project
   */
  async createProject(projectData, createdBy) {
    try {
      const {
        name,
        description,
        status = 'draft',
        maxTeams,
        membersPerTeam,
        deadline,
        startDate,
        instructions,
        gradingCriteria,
        totalPoints = 100
      } = projectData;

      // Validate required fields
      if (!name || !name.trim()) {
        throw new Error("Project name is required");
      }

      if (!maxTeams || maxTeams < 1) {
        throw new Error("Maximum teams must be at least 1");
      }

      if (!membersPerTeam || membersPerTeam < 1) {
        throw new Error("Members per team must be at least 1");
      }

      // Insert project
      const [result] = await promisePool.query(
        `INSERT INTO group_projects (
          name, description, status, max_teams, members_per_team,
          deadline, start_date, instructions, grading_criteria, total_points,
          created_by, last_updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          description || null,
          status,
          maxTeams,
          membersPerTeam,
          deadline || null,
          startDate || null,
          instructions || null,
          gradingCriteria || null,
          totalPoints,
          createdBy,
          createdBy
        ]
      );

      return {
        id: result.insertId,
        name: name.trim(),
        description,
        status,
        maxTeams,
        membersPerTeam,
        deadline,
        startDate,
        instructions,
        gradingCriteria,
        totalPoints
      };
    } catch (error) {
      console.error("Error in createProject:", error);
      throw error;
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId, projectData, updatedBy) {
    try {
      const {
        name,
        description,
        status,
        maxTeams,
        membersPerTeam,
        deadline,
        startDate,
        instructions,
        gradingCriteria,
        totalPoints
      } = projectData;

      // Verify project exists
      const [existing] = await promisePool.query(
        "SELECT id FROM group_projects WHERE id = ? AND is_deleted = 0",
        [projectId]
      );

      if (existing.length === 0) {
        throw new Error("Project not found");
      }

      // Validate required fields
      if (name && !name.trim()) {
        throw new Error("Project name cannot be empty");
      }

      // Build update query dynamically based on provided fields
      const updates = [];
      const params = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name.trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description || null);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }
      if (maxTeams !== undefined) {
        updates.push('max_teams = ?');
        params.push(maxTeams);
      }
      if (membersPerTeam !== undefined) {
        updates.push('members_per_team = ?');
        params.push(membersPerTeam);
      }
      if (deadline !== undefined) {
        updates.push('deadline = ?');
        params.push(deadline || null);
      }
      if (startDate !== undefined) {
        updates.push('start_date = ?');
        params.push(startDate || null);
      }
      if (instructions !== undefined) {
        updates.push('instructions = ?');
        params.push(instructions || null);
      }
      if (gradingCriteria !== undefined) {
        updates.push('grading_criteria = ?');
        params.push(gradingCriteria || null);
      }
      if (totalPoints !== undefined) {
        updates.push('total_points = ?');
        params.push(totalPoints);
      }

      updates.push('last_updated_by = ?');
      params.push(updatedBy);

      params.push(projectId);

      await promisePool.query(
        `UPDATE group_projects SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return { id: projectId, ...projectData };
    } catch (error) {
      console.error("Error in updateProject:", error);
      throw error;
    }
  }

  /**
   * Delete a project (soft delete)
   */
  async deleteProject(projectId) {
    try {
      const [result] = await promisePool.query(
        "UPDATE group_projects SET is_deleted = 1 WHERE id = ? AND is_deleted = 0",
        [projectId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Project not found");
      }

      // Also soft delete all related entities
      await promisePool.query(
        "UPDATE group_project_teams SET is_deleted = 1 WHERE project_id = ?",
        [projectId]
      );

      await promisePool.query(
        "UPDATE group_project_deliverables SET is_deleted = 1 WHERE project_id = ?",
        [projectId]
      );

      await promisePool.query(
        "UPDATE group_project_submissions SET is_deleted = 1 WHERE project_id = ?",
        [projectId]
      );

      return { success: true, message: "Project deleted successfully" };
    } catch (error) {
      console.error("Error in deleteProject:", error);
      throw error;
    }
  }

  // ============================================================================
  // TEAM OPERATIONS
  // ============================================================================

  /**
   * Get teams for a project
   */
  async getTeams(projectId) {
    try {
      const [teams] = await promisePool.query(`
        SELECT
          gpt.id,
          gpt.team_name as teamName,
          gpt.team_number as teamNumber,
          gpt.description,
          gpt.created_date as createdDate,
          (
            SELECT COUNT(*)
            FROM group_project_team_members gptm
            WHERE gptm.team_id = gpt.id AND gptm.is_deleted = 0
          ) as memberCount
        FROM group_project_teams gpt
        WHERE gpt.project_id = ? AND gpt.is_deleted = 0
        ORDER BY gpt.team_number ASC
      `, [projectId]);

      // Get members for each team
      for (let team of teams) {
        const [members] = await promisePool.query(`
          SELECT
            gptm.id,
            gptm.user_id as userId,
            gptm.role,
            u.email,
            CONCAT(up.first_name, ' ', up.last_name) as name
          FROM group_project_team_members gptm
          INNER JOIN users u ON gptm.user_id = u.uuid
          LEFT JOIN user_profile up ON u.uuid = up.user_id
          WHERE gptm.team_id = ? AND gptm.is_deleted = 0
        `, [team.id]);

        team.members = members;
      }

      return teams;
    } catch (error) {
      console.error("Error in getTeams:", error);
      throw error;
    }
  }

  /**
   * Create a team
   */
  async createTeam(projectId, teamData, createdBy) {
    try {
      const { teamName, teamNumber, description } = teamData;

      // Verify project exists
      const [project] = await promisePool.query(
        "SELECT max_teams FROM group_projects WHERE id = ? AND is_deleted = 0",
        [projectId]
      );

      if (project.length === 0) {
        throw new Error("Project not found");
      }

      // Check if team number already exists for this project
      const [existing] = await promisePool.query(
        "SELECT id FROM group_project_teams WHERE project_id = ? AND team_number = ? AND is_deleted = 0",
        [projectId, teamNumber]
      );

      if (existing.length > 0) {
        throw new Error("Team number already exists for this project");
      }

      // Check if max teams limit reached
      const [teamCount] = await promisePool.query(
        "SELECT COUNT(*) as count FROM group_project_teams WHERE project_id = ? AND is_deleted = 0",
        [projectId]
      );

      if (teamCount[0].count >= project[0].max_teams) {
        throw new Error("Maximum teams limit reached for this project");
      }

      const [result] = await promisePool.query(
        `INSERT INTO group_project_teams (project_id, team_name, team_number, description, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, teamName, teamNumber, description || null, createdBy]
      );

      return {
        id: result.insertId,
        projectId,
        teamName,
        teamNumber,
        description
      };
    } catch (error) {
      console.error("Error in createTeam:", error);
      throw error;
    }
  }

  /**
   * Update a team
   */
  async updateTeam(teamId, teamData) {
    try {
      const { teamName, description } = teamData;

      const [result] = await promisePool.query(
        `UPDATE group_project_teams
         SET team_name = ?, description = ?
         WHERE id = ? AND is_deleted = 0`,
        [teamName, description || null, teamId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Team not found");
      }

      return { id: teamId, teamName, description };
    } catch (error) {
      console.error("Error in updateTeam:", error);
      throw error;
    }
  }

  /**
   * Delete a team (soft delete)
   */
  async deleteTeam(teamId) {
    try {
      const [result] = await promisePool.query(
        "UPDATE group_project_teams SET is_deleted = 1 WHERE id = ? AND is_deleted = 0",
        [teamId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Team not found");
      }

      // Also soft delete team members
      await promisePool.query(
        "UPDATE group_project_team_members SET is_deleted = 1 WHERE team_id = ?",
        [teamId]
      );

      return { success: true, message: "Team deleted successfully" };
    } catch (error) {
      console.error("Error in deleteTeam:", error);
      throw error;
    }
  }

  /**
   * Add member to team
   */
  async addTeamMember(teamId, userId, role = 'member') {
    try {
      // Verify team exists and get project details
      const [team] = await promisePool.query(`
        SELECT gpt.project_id, gp.members_per_team
        FROM group_project_teams gpt
        INNER JOIN group_projects gp ON gpt.project_id = gp.id
        WHERE gpt.id = ? AND gpt.is_deleted = 0
      `, [teamId]);

      if (team.length === 0) {
        throw new Error("Team not found");
      }

      // Check if member already in this team
      const [existing] = await promisePool.query(
        "SELECT id FROM group_project_team_members WHERE team_id = ? AND user_id = ? AND is_deleted = 0",
        [teamId, userId]
      );

      if (existing.length > 0) {
        throw new Error("User is already a member of this team");
      }

      // Check if user is in another team for the same project
      const [otherTeam] = await promisePool.query(`
        SELECT gptm.id
        FROM group_project_team_members gptm
        INNER JOIN group_project_teams gpt ON gptm.team_id = gpt.id
        WHERE gpt.project_id = ? AND gptm.user_id = ? AND gptm.is_deleted = 0
      `, [team[0].project_id, userId]);

      if (otherTeam.length > 0) {
        throw new Error("User is already assigned to another team in this project");
      }

      // Check if team is full
      const [memberCount] = await promisePool.query(
        "SELECT COUNT(*) as count FROM group_project_team_members WHERE team_id = ? AND is_deleted = 0",
        [teamId]
      );

      if (memberCount[0].count >= team[0].members_per_team) {
        throw new Error("Team is already full");
      }

      const [result] = await promisePool.query(
        "INSERT INTO group_project_team_members (team_id, user_id, role) VALUES (?, ?, ?)",
        [teamId, userId, role]
      );

      return {
        id: result.insertId,
        teamId,
        userId,
        role
      };
    } catch (error) {
      console.error("Error in addTeamMember:", error);
      throw error;
    }
  }

  /**
   * Remove member from team (soft delete)
   */
  async removeTeamMember(memberId) {
    try {
      const [result] = await promisePool.query(
        "UPDATE group_project_team_members SET is_deleted = 1 WHERE id = ? AND is_deleted = 0",
        [memberId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Team member not found");
      }

      return { success: true, message: "Team member removed successfully" };
    } catch (error) {
      console.error("Error in removeTeamMember:", error);
      throw error;
    }
  }

  // ============================================================================
  // SUBMISSION OPERATIONS
  // ============================================================================

  /**
   * Get submissions for a project
   */
  async getSubmissions(projectId, filters = {}) {
    try {
      const { teamId, status } = filters;

      let query = `
        SELECT
          gps.id,
          gps.project_id as projectId,
          gps.team_id as teamId,
          gpt.team_name as teamName,
          gps.deliverable_id as deliverableId,
          gpd.title as deliverableTitle,
          gps.submission_title as submissionTitle,
          gps.submission_content as submissionContent,
          gps.submission_file_url as submissionFileUrl,
          gps.submission_file_name as submissionFileName,
          gps.submitted_by as submittedBy,
          gps.submitted_date as submittedDate,
          gps.status,
          gps.grade,
          gps.max_grade as maxGrade,
          gps.feedback,
          gps.graded_by as gradedBy,
          gps.graded_date as gradedDate
        FROM group_project_submissions gps
        INNER JOIN group_project_teams gpt ON gps.team_id = gpt.id
        LEFT JOIN group_project_deliverables gpd ON gps.deliverable_id = gpd.id
        WHERE gps.project_id = ? AND gps.is_deleted = 0
      `;

      const params = [projectId];

      if (teamId) {
        query += ` AND gps.team_id = ?`;
        params.push(teamId);
      }

      if (status) {
        query += ` AND gps.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY gps.submitted_date DESC`;

      const [submissions] = await promisePool.query(query, params);

      return submissions;
    } catch (error) {
      console.error("Error in getSubmissions:", error);
      throw error;
    }
  }

  /**
   * Create or update submission
   */
  async submitWork(submissionData, submittedBy) {
    try {
      const {
        projectId,
        teamId,
        deliverableId,
        submissionTitle,
        submissionContent,
        submissionFileUrl,
        submissionFileName,
        maxGrade
      } = submissionData;

      // Verify team exists and user is a member
      const [teamMember] = await promisePool.query(`
        SELECT gptm.id
        FROM group_project_team_members gptm
        WHERE gptm.team_id = ? AND gptm.user_id = ? AND gptm.is_deleted = 0
      `, [teamId, submittedBy]);

      if (teamMember.length === 0) {
        throw new Error("You are not a member of this team");
      }

      const [result] = await promisePool.query(
        `INSERT INTO group_project_submissions (
          project_id, team_id, deliverable_id, submission_title, submission_content,
          submission_file_url, submission_file_name, submitted_by, max_grade, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
        [
          projectId,
          teamId,
          deliverableId || null,
          submissionTitle,
          submissionContent || null,
          submissionFileUrl || null,
          submissionFileName || null,
          submittedBy,
          maxGrade || 100
        ]
      );

      return {
        id: result.insertId,
        projectId,
        teamId,
        submissionTitle,
        status: 'submitted'
      };
    } catch (error) {
      console.error("Error in submitWork:", error);
      throw error;
    }
  }

  /**
   * Grade a submission
   */
  async gradeSubmission(submissionId, gradeData, gradedBy) {
    try {
      const { grade, feedback, status = 'graded' } = gradeData;

      const [result] = await promisePool.query(
        `UPDATE group_project_submissions
         SET grade = ?, feedback = ?, status = ?, graded_by = ?, graded_date = NOW()
         WHERE id = ? AND is_deleted = 0`,
        [grade, feedback || null, status, gradedBy, submissionId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Submission not found");
      }

      return {
        id: submissionId,
        grade,
        feedback,
        status,
        gradedBy
      };
    } catch (error) {
      console.error("Error in gradeSubmission:", error);
      throw error;
    }
  }

  /**
   * Delete a submission (soft delete)
   */
  async deleteSubmission(submissionId) {
    try {
      const [result] = await promisePool.query(
        "UPDATE group_project_submissions SET is_deleted = 1 WHERE id = ? AND is_deleted = 0",
        [submissionId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Submission not found");
      }

      return { success: true, message: "Submission deleted successfully" };
    } catch (error) {
      console.error("Error in deleteSubmission:", error);
      throw error;
    }
  }

  // ============================================================================
  // DELIVERABLE OPERATIONS
  // ============================================================================

  /**
   * Get deliverables for a project
   */
  async getDeliverables(projectId) {
    try {
      const [deliverables] = await promisePool.query(`
        SELECT
          id,
          title,
          display_order as displayOrder
        FROM group_project_deliverables
        WHERE project_id = ? AND is_deleted = 0
        ORDER BY display_order ASC
      `, [projectId]);

      return deliverables;
    } catch (error) {
      console.error("Error in getDeliverables:", error);
      throw error;
    }
  }

  /**
   * Create a deliverable
   */
  async createDeliverable(projectId, deliverableData) {
    try {
      const { title, displayOrder } = deliverableData;

      const [result] = await promisePool.query(
        `INSERT INTO group_project_deliverables (project_id, title, display_order)
         VALUES (?, ?, ?)`,
        [projectId, title, displayOrder || 0]
      );

      return {
        id: result.insertId,
        projectId,
        title,
        displayOrder
      };
    } catch (error) {
      console.error("Error in createDeliverable:", error);
      throw error;
    }
  }

  /**
   * Update a deliverable
   */
  async updateDeliverable(deliverableId, deliverableData) {
    try {
      const { title, displayOrder } = deliverableData;

      const [result] = await promisePool.query(
        `UPDATE group_project_deliverables
         SET title = ?, display_order = ?
         WHERE id = ? AND is_deleted = 0`,
        [title, displayOrder || 0, deliverableId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Deliverable not found");
      }

      return { id: deliverableId, title, displayOrder };
    } catch (error) {
      console.error("Error in updateDeliverable:", error);
      throw error;
    }
  }

  /**
   * Delete a deliverable (soft delete)
   */
  async deleteDeliverable(deliverableId) {
    try {
      const [result] = await promisePool.query(
        "UPDATE group_project_deliverables SET is_deleted = 1 WHERE id = ? AND is_deleted = 0",
        [deliverableId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Deliverable not found");
      }

      return { success: true, message: "Deliverable deleted successfully" };
    } catch (error) {
      console.error("Error in deleteDeliverable:", error);
      throw error;
    }
  }
}

module.exports = new GroupProjectService();
