-- =============================================
-- Add organization_id and manager_id to teams
-- Migration A for Assignments feature
-- =============================================

ALTER TABLE teams
  ADD COLUMN organization_id INT NULL AFTER name,
  ADD COLUMN manager_id VARCHAR(36) NULL AFTER organization_id,
  ADD CONSTRAINT fk_teams_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES users(uuid) ON DELETE SET NULL,
  ADD INDEX idx_teams_org (organization_id),
  ADD INDEX idx_teams_manager (manager_id);

-- =============================================
-- Update sp_create_team / sp_update_team to accept the two new fields.
-- New params are NULL-safe for callers that don't pass them.
-- =============================================
DROP PROCEDURE IF EXISTS sp_create_team;
DROP PROCEDURE IF EXISTS sp_update_team;

DELIMITER //

CREATE PROCEDURE sp_create_team(
  IN p_name VARCHAR(100),
  IN p_description TEXT,
  IN p_created_by VARCHAR(36),
  IN p_organization_id INT,
  IN p_manager_id VARCHAR(36)
)
BEGIN
  INSERT INTO teams (name, description, created_by, organization_id, manager_id)
  VALUES (p_name, p_description, p_created_by, p_organization_id, p_manager_id);

  SELECT LAST_INSERT_ID() AS id;
END //

CREATE PROCEDURE sp_update_team(
  IN p_team_id INT,
  IN p_name VARCHAR(100),
  IN p_description TEXT,
  IN p_organization_id INT,
  IN p_manager_id VARCHAR(36)
)
BEGIN
  UPDATE teams
  SET
    name = p_name,
    description = p_description,
    organization_id = COALESCE(p_organization_id, organization_id),
    manager_id = COALESCE(p_manager_id, manager_id)
  WHERE id = p_team_id AND is_deleted = 0;

  SELECT ROW_COUNT() AS affectedRows;
END //

DELIMITER ;
