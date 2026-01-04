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
    DATE_FORMAT(lp.completed_at, '%b %Y') as date,
    CONCAT('LP-', LPAD(lp.id, 6, '0')) as credentialId,
    CONCAT(lp.estimated_duration_weeks, ' weeks') as duration,
    CAST(avg_score as CHAR) as grade,
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
    color
  FROM ai_learning_path_skills
  WHERE user_id = p_user_id
  ORDER BY mastery_percentage DESC;
END$$

DELIMITER ;

SELECT 'AI Learning Paths stored procedures created successfully!' AS status;
