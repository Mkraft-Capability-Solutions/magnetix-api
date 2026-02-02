-- ========================================
-- AI LEARNING PATHS STORED PROCEDURES
-- ========================================
-- Procedures for managing AI learning paths data
-- ========================================

USE lms_db;

DELIMITER $$

-- ========================================
-- PROCEDURE 1: Get User Learning Paths
-- ========================================
-- Returns all active learning paths for a user
-- Includes sharer information for shared paths
-- ========================================
DROP PROCEDURE IF EXISTS `get_user_learning_paths`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_user_learning_paths` (
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  SELECT
    lp.*,
    (SELECT COUNT(*)
     FROM ai_learning_path_modules
     WHERE learning_path_id = lp.id
       AND status = 'completed') as completed_count
  FROM ai_learning_paths lp
  WHERE lp.user_id = p_user_id
    AND lp.status != 'archived'
  ORDER BY lp.last_accessed DESC, lp.created_at DESC;
END$$

-- ========================================
-- PROCEDURE 2: Get Learning Path Detail
-- ========================================
-- Returns detailed information about a specific learning path
-- including all modules with their topics
-- ========================================
DROP PROCEDURE IF EXISTS `get_learning_path_detail`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_learning_path_detail` (
  IN `p_learning_path_id` INT,
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  -- Result Set 1: Learning path details
  SELECT * FROM ai_learning_paths
  WHERE id = p_learning_path_id
    AND user_id = p_user_id;

  -- Result Set 2: Modules with topics as JSON
  SELECT
    m.*,
    (SELECT JSON_ARRAYAGG(
       JSON_OBJECT(
         'id', t.id,
         'name', t.topic_name,
         'completed', t.is_completed
       )
     )
     FROM ai_learning_path_module_topics t
     WHERE t.module_id = m.id
     ORDER BY t.topic_order) as topics
  FROM ai_learning_path_modules m
  WHERE m.learning_path_id = p_learning_path_id
  ORDER BY m.module_order;
END$$

-- ========================================
-- PROCEDURE 3: Get Progress Data
-- ========================================
-- Returns data for Progress tab (Tab 2)
-- Stats, learning paths, and analytics
-- ========================================
DROP PROCEDURE IF EXISTS `get_ai_progress_data`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_ai_progress_data` (
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  DECLARE total_hours DECIMAL(10,2);
  DECLARE completed_count INT;
  DECLARE current_streak INT;
  DECLARE total_achievements INT;

  -- Calculate total hours spent
  SELECT COALESCE(SUM(time_spent_hours), 0) INTO total_hours
  FROM ai_learning_paths
  WHERE user_id = p_user_id;

  -- Count completed modules
  SELECT COUNT(*) INTO completed_count
  FROM ai_learning_path_modules m
  JOIN ai_learning_paths lp ON m.learning_path_id = lp.id
  WHERE lp.user_id = p_user_id
    AND m.status = 'completed';

  -- Get current streak (simplified - days with activity)
  SET current_streak = 7; -- Placeholder

  -- Get total achievements from gamification system
  SELECT COUNT(*) INTO total_achievements
  FROM user_achievements
  WHERE user_id = p_user_id
    AND is_unlocked = 1;

  -- Result Set 1: Stats
  SELECT 1 as id, 'Total Hours' as label, CAST(total_hours as CHAR) as value, '+12 this week' as `change`, TRUE as isPositive
  UNION ALL
  SELECT 2, 'Completed', CAST(completed_count as CHAR), 'Modules Finished', FALSE
  UNION ALL
  SELECT 3, 'Current Streak', CAST(current_streak as CHAR), 'Days in a row', FALSE
  UNION ALL
  SELECT 4, 'Achievements', CONCAT(total_achievements, '/20'), 'Unlock 8 more', TRUE;

  -- Result Set 2: Learning Paths
  SELECT
    lp.id,
    lp.title,
    lp.type,
    lp.progress,
    lp.status,
    lp.total_modules,
    lp.completed_modules,
    lp.time_spent_hours,
    lp.estimated_duration_weeks,
    lp.last_accessed
  FROM ai_learning_paths lp
  WHERE lp.user_id = p_user_id
    AND lp.status IN ('not_started', 'in_progress')
  ORDER BY lp.last_accessed DESC
  LIMIT 5;
END$$

-- ========================================
-- PROCEDURE 4: Get Statistics Data
-- ========================================
-- Returns data for Statistics tab (Tab 3)
-- Stats, completed courses, and skills
-- ========================================
DROP PROCEDURE IF EXISTS `get_ai_statistics_data`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_ai_statistics_data` (
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  DECLARE total_hours DECIMAL(10,2);
  DECLARE completed_paths INT;
  DECLARE current_streak INT;
  DECLARE avg_score DECIMAL(5,2);

  -- Calculate total hours
  SELECT COALESCE(SUM(time_spent_hours), 0) INTO total_hours
  FROM ai_learning_paths
  WHERE user_id = p_user_id;

  -- Count completed paths
  SELECT COUNT(*) INTO completed_paths
  FROM ai_learning_paths
  WHERE user_id = p_user_id
    AND status = 'completed';

  -- Calculate average score
  SELECT COALESCE(AVG(score), 0) INTO avg_score
  FROM ai_learning_path_modules m
  JOIN ai_learning_paths lp ON m.learning_path_id = lp.id
  WHERE lp.user_id = p_user_id
    AND m.score IS NOT NULL;

  SET current_streak = 7; -- Placeholder

  -- Result Set 1: Stats
  SELECT 1 as id, 'Total Learning Hours' as label, CAST(total_hours as CHAR) as value, '+ 12 this week' as `change`, TRUE as isPositive
  UNION ALL
  SELECT 2, 'Course Completed', CAST(completed_paths as CHAR), 'Modules Finished', FALSE
  UNION ALL
  SELECT 3, 'Current Streak', CAST(current_streak as CHAR), 'Days in a row', FALSE
  UNION ALL
  SELECT 4, 'Average Score', CONCAT(CAST(avg_score as CHAR), '%'), '+ 4% improvement', TRUE;

  -- Result Set 2: Completed Paths (as "courses")
  SELECT
    lp.id,
    lp.title,
    lp.type as provider,
    DATE_FORMAT(lp.updated_at, '%b %Y') as date,
    CONCAT('LP-', LPAD(lp.id, 6, '0')) as credentialId,
    CONCAT(lp.estimated_duration_weeks, ' weeks') as duration,
    CAST(scores.avg_score as CHAR) as grade,
    CASE
      WHEN lp.type = 'ai_generated' THEN 'ai'
      WHEN lp.type = 'custom' THEN 'custom'
      ELSE 'recommended'
    END as logo
  FROM ai_learning_paths lp
  LEFT JOIN (
    SELECT learning_path_id, AVG(score) as avg_score
    FROM ai_learning_path_modules
    WHERE score IS NOT NULL
    GROUP BY learning_path_id
  ) scores ON lp.id = scores.learning_path_id
  WHERE lp.user_id = p_user_id
    AND lp.status = 'completed'
  ORDER BY lp.updated_at DESC
  LIMIT 10;

  -- Result Set 3: Skills
  SELECT
    id,
    skill_name as name,
    skill_level as level,
    mastery_percentage as mastery,
    color,
    category
  FROM ai_learning_path_skills
  WHERE user_id = p_user_id
  ORDER BY mastery_percentage DESC;
END$$

-- ========================================
-- PROCEDURE 5: Add User Skill
-- ========================================
-- Adds a new skill for a user to track
-- ========================================
DROP PROCEDURE IF EXISTS `add_user_skill`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `add_user_skill` (
  IN `p_user_id` VARCHAR(36),
  IN `p_skill_name` VARCHAR(100),
  IN `p_skill_level` VARCHAR(20),
  IN `p_category` VARCHAR(50),
  IN `p_color` VARCHAR(7)
)
BEGIN
  DECLARE new_skill_id INT;

  -- Insert the new skill
  INSERT INTO ai_learning_path_skills (
    user_id,
    skill_name,
    skill_level,
    category,
    color,
    mastery_percentage
  ) VALUES (
    p_user_id,
    p_skill_name,
    p_skill_level,
    p_category,
    p_color,
    0.00
  );

  SET new_skill_id = LAST_INSERT_ID();

  -- Return the newly created skill
  SELECT
    id,
    skill_name as name,
    skill_level as level,
    mastery_percentage as mastery,
    color,
    category
  FROM ai_learning_path_skills
  WHERE id = new_skill_id;
END$$

-- ========================================
-- PROCEDURE 6: Update User Skill
-- ========================================
-- Updates an existing skill for a user
-- ========================================
DROP PROCEDURE IF EXISTS `update_user_skill`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `update_user_skill` (
  IN `p_skill_id` INT,
  IN `p_user_id` VARCHAR(36),
  IN `p_skill_name` VARCHAR(100),
  IN `p_skill_level` VARCHAR(20),
  IN `p_category` VARCHAR(50),
  IN `p_color` VARCHAR(7)
)
BEGIN
  -- Update the skill (only if it belongs to the user)
  UPDATE ai_learning_path_skills
  SET
    skill_name = p_skill_name,
    skill_level = p_skill_level,
    category = p_category,
    color = p_color,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_skill_id AND user_id = p_user_id;

  -- Return the updated skill
  SELECT
    id,
    skill_name as name,
    skill_level as level,
    mastery_percentage as mastery,
    color,
    category
  FROM ai_learning_path_skills
  WHERE id = p_skill_id AND user_id = p_user_id;
END$$

-- ========================================
-- PROCEDURE 7: Delete User Skill
-- ========================================
-- Deletes a skill for a user
-- ========================================
DROP PROCEDURE IF EXISTS `delete_user_skill`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `delete_user_skill` (
  IN `p_skill_id` INT,
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  DECLARE affected_rows INT;

  -- Delete the skill (only if it belongs to the user)
  DELETE FROM ai_learning_path_skills
  WHERE id = p_skill_id AND user_id = p_user_id;

  SET affected_rows = ROW_COUNT();

  -- Return result
  SELECT affected_rows as deleted;
END$$

-- ========================================
-- PROCEDURE 8: Search Trainees
-- ========================================
-- Search trainees by name or email for sharing
-- Excludes the current user from results
-- ========================================
DROP PROCEDURE IF EXISTS `search_trainees`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `search_trainees` (
  IN `p_current_user_id` VARCHAR(36),
  IN `p_search_query` VARCHAR(100)
)
BEGIN
  SELECT
    s.user_id as uuid,
    s.first_name,
    s.last_name,
    u.email,
    s.dp
  FROM students s
  JOIN users u ON s.user_id = u.uuid
  WHERE s.user_id != p_current_user_id
    AND u.is_deleted = 0
    AND (
      LOWER(s.first_name) LIKE CONCAT('%', LOWER(p_search_query), '%')
      OR LOWER(s.last_name) LIKE CONCAT('%', LOWER(p_search_query), '%')
      OR LOWER(CONCAT(s.first_name, ' ', s.last_name)) LIKE CONCAT('%', LOWER(p_search_query), '%')
      OR LOWER(u.email) LIKE CONCAT('%', LOWER(p_search_query), '%')
    )
  ORDER BY s.first_name, s.last_name
  LIMIT 10;
END$$

-- ========================================
-- PROCEDURE 9: Copy Learning Path to User
-- ========================================
-- Copies a learning path (with modules and topics)
-- to another user as a shared path
-- ========================================
DROP PROCEDURE IF EXISTS `copy_learning_path_to_user`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `copy_learning_path_to_user` (
  IN `p_path_id` INT,
  IN `p_from_user_id` VARCHAR(36),
  IN `p_to_user_id` VARCHAR(36)
)
BEGIN
  DECLARE v_new_path_id INT;
  DECLARE v_original_path_exists INT;

  -- Check if original path exists and belongs to from_user
  SELECT COUNT(*) INTO v_original_path_exists
  FROM ai_learning_paths
  WHERE id = p_path_id AND user_id = p_from_user_id;

  IF v_original_path_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Learning path not found or access denied';
  END IF;

  -- Copy the learning path
  INSERT INTO ai_learning_paths (
    user_id,
    title,
    description,
    type,
    difficulty_level,
    total_modules,
    completed_modules,
    progress,
    status,
    estimated_duration_weeks,
    time_spent_hours
  )
  SELECT
    p_to_user_id,
    title,
    description,
    type,
    difficulty_level,
    total_modules,
    0,  -- Reset completed_modules for new user
    0.00,  -- Reset progress for new user
    'not_started',  -- Reset status
    estimated_duration_weeks,
    0.00  -- Reset time_spent
  FROM ai_learning_paths
  WHERE id = p_path_id;

  SET v_new_path_id = LAST_INSERT_ID();

  -- Copy modules (reset progress/status for new user)
  INSERT INTO ai_learning_path_modules (
    learning_path_id,
    module_order,
    title,
    description,
    duration_weeks,
    status,
    score,
    progress
  )
  SELECT
    v_new_path_id,
    module_order,
    title,
    description,
    duration_weeks,
    CASE WHEN module_order = 1 THEN 'unlocked' ELSE 'locked' END,  -- First module unlocked
    NULL,  -- Reset score
    0.00  -- Reset progress
  FROM ai_learning_path_modules
  WHERE learning_path_id = p_path_id
  ORDER BY module_order;

  -- Copy topics for each module
  INSERT INTO ai_learning_path_module_topics (
    module_id,
    topic_name,
    topic_order,
    is_completed
  )
  SELECT
    new_m.id,
    old_t.topic_name,
    old_t.topic_order,
    FALSE  -- Reset completion status
  FROM ai_learning_path_module_topics old_t
  JOIN ai_learning_path_modules old_m ON old_t.module_id = old_m.id
  JOIN ai_learning_path_modules new_m ON new_m.learning_path_id = v_new_path_id
    AND new_m.module_order = old_m.module_order
  WHERE old_m.learning_path_id = p_path_id;

  -- Return the new learning path
  SELECT lp.*
  FROM ai_learning_paths lp
  WHERE lp.id = v_new_path_id;
END$$

DELIMITER ;

SELECT 'AI Learning Paths stored procedures created successfully!' AS status;
