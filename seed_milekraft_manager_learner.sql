-- =============================================================================
-- Seed: Milekraft Technologies — manager + learner pair for testing the
-- "non-team manager via reports_to_uuid" visibility rules.
--
-- Manager:  manager.test@milekraft.com  / Test@1234   (role_id = 1, trainee)
-- Learner:  learner.test@milekraft.com  / Test@1234   (role_id = 1, trainee)
--
-- Both users are mapped to organization "Milekraft Technologies" (id=1) and
-- the learner's reports_to_uuid points to the manager. The manager has NO
-- entry in `teams.manager_id`, so they exercise the new reportee-based path
-- in requireAnyManagerRole / listManagedAssignments / listManagedSubmissions.
--
-- Both users are role_id=1 (trainee) so the manager gating is purely via
-- the reports_to chain — exactly the case the recent change targets.
-- =============================================================================

SET @manager_uuid = '4735814c-4738-4d4f-9272-8b189ab7bbd5';
SET @learner_uuid = 'edd2bb69-c0a7-476a-bf4f-318511faa2ba';
SET @password_hash = '$2b$10$oZpN/VAiBOgZPSMWtVrxl.SWtvfe/5F31TSl4m3DsFXCxRSSwhGzS';
SET @milekraft_org_id = 1;

-- 1. users (idempotent — re-running updates the existing row)
INSERT INTO users (uuid, email, password, role_id, status, instance, is_deleted)
VALUES
  (@manager_uuid, 'manager.test@milekraft.com', @password_hash, 1, 'active', 'default', 0),
  (@learner_uuid, 'learner.test@milekraft.com', @password_hash, 1, 'active', 'default', 0)
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  status   = VALUES(status),
  is_deleted = 0;

-- 2. learner reports to manager (idempotent UPDATE)
UPDATE users SET reports_to_uuid = @manager_uuid WHERE uuid = @learner_uuid;

-- 3. students profile rows (role_id=1)
INSERT INTO students (user_id, first_name, last_name)
VALUES
  (@manager_uuid, 'Manager', 'Tester'),
  (@learner_uuid, 'Learner', 'Tester')
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name  = VALUES(last_name);

-- 4. organization mapping
INSERT INTO user_organizations (user_id, organization_id)
VALUES
  (@manager_uuid, @milekraft_org_id),
  (@learner_uuid, @milekraft_org_id)
ON DUPLICATE KEY UPDATE assigned_at = assigned_at;

SELECT 'Seed completed' AS status,
       (SELECT COUNT(*) FROM users WHERE uuid IN (@manager_uuid, @learner_uuid)) AS users_present,
       (SELECT COUNT(*) FROM user_organizations WHERE user_id IN (@manager_uuid, @learner_uuid) AND organization_id = @milekraft_org_id) AS org_mappings,
       (SELECT reports_to_uuid FROM users WHERE uuid = @learner_uuid) AS learner_reports_to;
