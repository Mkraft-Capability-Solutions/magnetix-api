-- ============================================================================
-- Group Project Management Tables Migration
-- ============================================================================
-- Creates tables for managing group projects, teams, members, and submissions
-- ============================================================================

USE lxp_db;

-- ============================================================================
-- Table 1: Group Projects
-- Main table storing project information
-- ============================================================================
CREATE TABLE IF NOT EXISTS `group_projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL COMMENT 'Project name',
  `description` TEXT NULL COMMENT 'Project description',
  `status` ENUM('draft', 'active', 'completed', 'archived') DEFAULT 'draft' COMMENT 'Project status',
  `max_teams` INT NOT NULL DEFAULT 1 COMMENT 'Maximum number of teams allowed',
  `members_per_team` INT NOT NULL DEFAULT 1 COMMENT 'Number of members per team',
  `deadline` DATETIME NULL COMMENT 'Project submission deadline',
  `start_date` DATETIME NULL COMMENT 'Project start date',
  `instructions` TEXT NULL COMMENT 'Detailed project instructions',
  `grading_criteria` TEXT NULL COMMENT 'Grading rubric or criteria',
  `total_points` INT DEFAULT 100 COMMENT 'Total points for the project',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT 'Soft delete flag',
  `created_by` VARCHAR(36) NOT NULL COMMENT 'User UUID who created the project',
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_updated_by` VARCHAR(36) NULL,

  -- Indexes
  INDEX `idx_status` (`status`),
  INDEX `idx_deadline` (`deadline`),
  INDEX `idx_is_deleted` (`is_deleted`),
  INDEX `idx_created_by` (`created_by`),

  -- Foreign keys
  CONSTRAINT `fk_project_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_updated_by` FOREIGN KEY (`last_updated_by`) REFERENCES `users` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores group project information';

-- ============================================================================
-- Table 2: Group Project Deliverables
-- Stores deliverables/milestones for each project
-- ============================================================================
CREATE TABLE IF NOT EXISTS `group_project_deliverables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL COMMENT 'Reference to group_projects',
  `title` VARCHAR(255) NOT NULL COMMENT 'Deliverable title',
  `description` TEXT NULL COMMENT 'Deliverable description',
  `due_date` DATETIME NULL COMMENT 'Deliverable due date',
  `points` INT DEFAULT 0 COMMENT 'Points allocated for this deliverable',
  `display_order` INT DEFAULT 0 COMMENT 'Display order for deliverables',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT 'Soft delete flag',
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_is_deleted` (`is_deleted`),
  INDEX `idx_display_order` (`display_order`),

  -- Foreign keys
  CONSTRAINT `fk_deliverable_project` FOREIGN KEY (`project_id`) REFERENCES `group_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores project deliverables/milestones';

-- ============================================================================
-- Table 3: Group Project Teams
-- Stores teams created for each project
-- ============================================================================
CREATE TABLE IF NOT EXISTS `group_project_teams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL COMMENT 'Reference to group_projects',
  `team_name` VARCHAR(255) NOT NULL COMMENT 'Team name',
  `team_number` INT NOT NULL COMMENT 'Team number within the project',
  `description` TEXT NULL COMMENT 'Team description or notes',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT 'Soft delete flag',
  `created_by` VARCHAR(36) NULL COMMENT 'User who created the team',
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_is_deleted` (`is_deleted`),
  INDEX `idx_team_number` (`team_number`),

  -- Foreign keys
  CONSTRAINT `fk_team_project` FOREIGN KEY (`project_id`) REFERENCES `group_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`uuid`) ON DELETE SET NULL,

  -- Unique constraint
  UNIQUE KEY `unique_project_team_number` (`project_id`, `team_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores teams within group projects';

-- ============================================================================
-- Table 4: Group Project Team Members
-- Stores individual team members
-- ============================================================================
CREATE TABLE IF NOT EXISTS `group_project_team_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `team_id` INT NOT NULL COMMENT 'Reference to group_project_teams',
  `user_id` VARCHAR(36) NOT NULL COMMENT 'User UUID of team member',
  `role` ENUM('leader', 'member') DEFAULT 'member' COMMENT 'Role within the team',
  `joined_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT 'Soft delete flag',

  -- Indexes
  INDEX `idx_team_id` (`team_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_deleted` (`is_deleted`),

  -- Foreign keys
  CONSTRAINT `fk_member_team` FOREIGN KEY (`team_id`) REFERENCES `group_project_teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE,

  -- Unique constraint - user can only be in one team per project
  UNIQUE KEY `unique_user_team` (`team_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores team members for group projects';

-- ============================================================================
-- Table 5: Group Project Submissions
-- Stores submissions from teams
-- ============================================================================
CREATE TABLE IF NOT EXISTS `group_project_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL COMMENT 'Reference to group_projects',
  `team_id` INT NOT NULL COMMENT 'Reference to group_project_teams',
  `deliverable_id` INT NULL COMMENT 'Optional reference to specific deliverable',
  `submission_title` VARCHAR(255) NOT NULL COMMENT 'Submission title',
  `submission_content` TEXT NULL COMMENT 'Submission content or description',
  `submission_file_url` VARCHAR(500) NULL COMMENT 'URL to uploaded file',
  `submission_file_name` VARCHAR(255) NULL COMMENT 'Original filename',
  `submitted_by` VARCHAR(36) NOT NULL COMMENT 'Team member who submitted',
  `submitted_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('pending', 'submitted', 'graded', 'returned') DEFAULT 'submitted' COMMENT 'Submission status',
  `grade` DECIMAL(5,2) NULL COMMENT 'Grade awarded',
  `max_grade` DECIMAL(5,2) NULL COMMENT 'Maximum possible grade',
  `feedback` TEXT NULL COMMENT 'Instructor feedback',
  `graded_by` VARCHAR(36) NULL COMMENT 'Instructor who graded',
  `graded_date` TIMESTAMP NULL COMMENT 'Date when graded',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT 'Soft delete flag',
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_team_id` (`team_id`),
  INDEX `idx_deliverable_id` (`deliverable_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_submitted_by` (`submitted_by`),
  INDEX `idx_is_deleted` (`is_deleted`),
  INDEX `idx_submitted_date` (`submitted_date`),

  -- Foreign keys
  CONSTRAINT `fk_submission_project` FOREIGN KEY (`project_id`) REFERENCES `group_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_team` FOREIGN KEY (`team_id`) REFERENCES `group_project_teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_deliverable` FOREIGN KEY (`deliverable_id`) REFERENCES `group_project_deliverables` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_submission_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`uuid`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_graded_by` FOREIGN KEY (`graded_by`) REFERENCES `users` (`uuid`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores team submissions for group projects';

-- ============================================================================
-- Additional indexes for performance optimization
-- ============================================================================
CREATE INDEX `idx_projects_status_deleted` ON `group_projects` (`status`, `is_deleted`);
CREATE INDEX `idx_teams_project_deleted` ON `group_project_teams` (`project_id`, `is_deleted`);
CREATE INDEX `idx_submissions_team_status` ON `group_project_submissions` (`team_id`, `status`);

SELECT 'Group project management tables created successfully!' AS status;
