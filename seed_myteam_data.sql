-- Seed Data for Instructor MyTeam Page
-- For instructor: instructor@milekraft.com (UUID: b4147cae-e2df-4bdb-9651-4569b100fb51)

SET @instructor_uuid = 'b4147cae-e2df-4bdb-9651-4569b100fb51';

-- Create teams table if it doesn't exist (check migrations first)
CREATE TABLE IF NOT EXISTS `teams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `team_id` INT NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE,
  INDEX `idx_team_id` (`team_id`),
  INDEX `idx_user_id` (`user_id`),
  UNIQUE KEY `unique_team_user` (`team_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create 3 teams for the instructor
INSERT INTO teams (name, description, created_by, created_at)
VALUES
    ('Digital Marketing Team', 'Team focused on digital marketing courses and certifications', @instructor_uuid, NOW()),
    ('AI & Technology Team', 'Team studying artificial intelligence and emerging technologies', @instructor_uuid, NOW()),
    ('Leadership Development Team', 'Team focused on leadership and management training', @instructor_uuid, NOW());

-- Get team IDs
SET @team1_id = (SELECT id FROM teams WHERE name = 'Digital Marketing Team' AND created_by = @instructor_uuid LIMIT 1);
SET @team2_id = (SELECT id FROM teams WHERE name = 'AI & Technology Team' AND created_by = @instructor_uuid LIMIT 1);
SET @team3_id = (SELECT id FROM teams WHERE name = 'Leadership Development Team' AND created_by = @instructor_uuid LIMIT 1);

-- Get some student user IDs (already enrolled students)
SET @student1 = '4313a2aa-ee2b-4a8d-98af-9c94f99b3626';
SET @student2 = 'c4402201-aa6d-45e0-a9a7-9319aa63792c';
SET @student3 = '56a74721-2861-417f-b235-a7b66ffd5718';

-- Get additional students from database
SET @student4 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 AND uuid NOT IN (@student1, @student2, @student3) LIMIT 1);
SET @student5 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 AND uuid NOT IN (@student1, @student2, @student3, @student4) LIMIT 1 OFFSET 1);
SET @student6 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 AND uuid NOT IN (@student1, @student2, @student3, @student4, @student5) LIMIT 1 OFFSET 2);
SET @student7 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 AND uuid NOT IN (@student1, @student2, @student3, @student4, @student5, @student6) LIMIT 1 OFFSET 3);
SET @student8 = (SELECT uuid FROM users WHERE role_id = 1 AND is_deleted = 0 AND uuid NOT IN (@student1, @student2, @student3, @student4, @student5, @student6, @student7) LIMIT 1 OFFSET 4);

-- Add members to Team 1 (Digital Marketing Team) - 4 members
INSERT IGNORE INTO team_members (team_id, user_id, added_at)
VALUES
    (@team1_id, @student1, NOW()),
    (@team1_id, @student2, NOW()),
    (@team1_id, @student4, NOW()),
    (@team1_id, @student5, NOW());

-- Add members to Team 2 (AI & Technology Team) - 3 members
INSERT IGNORE INTO team_members (team_id, user_id, added_at)
VALUES
    (@team2_id, @student3, NOW()),
    (@team2_id, @student6, NOW()),
    (@team2_id, @student7, NOW());

-- Add members to Team 3 (Leadership Development Team) - 5 members
INSERT IGNORE INTO team_members (team_id, user_id, added_at)
VALUES
    (@team3_id, @student1, NOW()),
    (@team3_id, @student2, NOW()),
    (@team3_id, @student3, NOW()),
    (@team3_id, @student4, NOW()),
    (@team3_id, @student8, NOW());

-- Verify teams created
SELECT
    '✓ Teams Created' as Status,
    COUNT(*) as Count
FROM teams
WHERE created_by = @instructor_uuid AND is_deleted = 0;

-- Verify team members added
SELECT
    t.name as Team,
    COUNT(tm.id) as Members
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.created_by = @instructor_uuid AND t.is_deleted = 0
GROUP BY t.id, t.name;

SELECT '✓ MyTeam data created successfully for instructor@milekraft.com' as Result;
