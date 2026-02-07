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

  -- Result Set 2: Modules with topics, linked courses, and external resources as JSON
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
     ORDER BY t.topic_order) as topics,
    (SELECT JSON_ARRAYAGG(
       JSON_OBJECT(
         'id', lc.id,
         'course_id', lc.course_id,
         'title', c.title,
         'thumbnail', c.thumbnail,
         'level', c.level
       )
     )
     FROM ai_learning_path_module_courses lc
     JOIN course c ON lc.course_id = c.id
     WHERE lc.module_id = m.id) as linked_courses,
    (SELECT JSON_ARRAYAGG(
       JSON_OBJECT(
         'id', er.id,
         'title', er.title,
         'platform', er.platform,
         'url', er.url,
         'description', er.description,
         'estimated_duration', er.estimated_duration,
         'is_free', er.is_free
       )
     )
     FROM ai_learning_path_module_external_resources er
     WHERE er.module_id = m.id) as external_resources
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

-- ========================================
-- PROCEDURE 10: Save Generated Learning Path
-- ========================================
-- Saves an AI-generated learning path with
-- all its modules and topics
-- ========================================
DROP PROCEDURE IF EXISTS `save_generated_learning_path`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `save_generated_learning_path` (
  IN `p_user_id` VARCHAR(36),
  IN `p_title` VARCHAR(255),
  IN `p_description` TEXT,
  IN `p_difficulty_level` VARCHAR(20),
  IN `p_estimated_duration_weeks` INT,
  IN `p_modules_json` JSON
)
BEGIN
  DECLARE v_path_id INT;
  DECLARE v_module_id INT;
  DECLARE v_module_count INT DEFAULT 0;
  DECLARE i INT DEFAULT 0;
  DECLARE v_module JSON;
  DECLARE v_topic_count INT;
  DECLARE v_course_count INT;
  DECLARE v_resource_count INT;
  DECLARE j INT;

  -- Start transaction
  START TRANSACTION;

  -- Insert learning path
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
  ) VALUES (
    p_user_id,
    p_title,
    p_description,
    'ai_generated',
    p_difficulty_level,
    JSON_LENGTH(p_modules_json),
    0,
    0.00,
    'not_started',
    p_estimated_duration_weeks,
    0.00
  );

  SET v_path_id = LAST_INSERT_ID();
  SET v_module_count = JSON_LENGTH(p_modules_json);

  -- Insert modules
  WHILE i < v_module_count DO
    SET v_module = JSON_EXTRACT(p_modules_json, CONCAT('$[', i, ']'));

    INSERT INTO ai_learning_path_modules (
      learning_path_id,
      module_order,
      title,
      description,
      duration_weeks,
      status,
      score,
      progress
    ) VALUES (
      v_path_id,
      JSON_UNQUOTE(JSON_EXTRACT(v_module, '$.module_order')),
      JSON_UNQUOTE(JSON_EXTRACT(v_module, '$.title')),
      JSON_UNQUOTE(JSON_EXTRACT(v_module, '$.description')),
      JSON_EXTRACT(v_module, '$.duration_weeks'),
      CASE WHEN i = 0 THEN 'unlocked' ELSE 'locked' END,
      NULL,
      0.00
    );

    SET v_module_id = LAST_INSERT_ID();

    -- Insert topics for this module
    SET v_topic_count = JSON_LENGTH(JSON_EXTRACT(v_module, '$.topics'));
    SET j = 0;

    WHILE j < v_topic_count DO
      INSERT INTO ai_learning_path_module_topics (
        module_id,
        topic_name,
        topic_order,
        is_completed
      ) VALUES (
        v_module_id,
        JSON_UNQUOTE(JSON_EXTRACT(v_module, CONCAT('$.topics[', j, ']'))),
        j + 1,
        FALSE
      );
      SET j = j + 1;
    END WHILE;

    -- Insert linked platform courses (if any)
    IF JSON_EXTRACT(v_module, '$.linked_courses') IS NOT NULL
       AND JSON_LENGTH(JSON_EXTRACT(v_module, '$.linked_courses')) > 0 THEN
      SET v_course_count = JSON_LENGTH(JSON_EXTRACT(v_module, '$.linked_courses'));
      SET j = 0;
      WHILE j < v_course_count DO
        INSERT INTO ai_learning_path_module_courses (module_id, course_id)
        VALUES (
          v_module_id,
          JSON_EXTRACT(v_module, CONCAT('$.linked_courses[', j, '].course_id'))
        );
        SET j = j + 1;
      END WHILE;
    END IF;

    -- Insert external resources (if any)
    IF JSON_EXTRACT(v_module, '$.external_resources') IS NOT NULL
       AND JSON_LENGTH(JSON_EXTRACT(v_module, '$.external_resources')) > 0 THEN
      SET v_resource_count = JSON_LENGTH(JSON_EXTRACT(v_module, '$.external_resources'));
      SET j = 0;
      WHILE j < v_resource_count DO
        INSERT INTO ai_learning_path_module_external_resources (
          module_id, title, platform, url, description, estimated_duration, is_free
        ) VALUES (
          v_module_id,
          JSON_UNQUOTE(JSON_EXTRACT(v_module, CONCAT('$.external_resources[', j, '].title'))),
          JSON_UNQUOTE(JSON_EXTRACT(v_module, CONCAT('$.external_resources[', j, '].platform'))),
          JSON_UNQUOTE(JSON_EXTRACT(v_module, CONCAT('$.external_resources[', j, '].url'))),
          JSON_UNQUOTE(JSON_EXTRACT(v_module, CONCAT('$.external_resources[', j, '].description'))),
          JSON_UNQUOTE(JSON_EXTRACT(v_module, CONCAT('$.external_resources[', j, '].estimated_duration'))),
          JSON_EXTRACT(v_module, CONCAT('$.external_resources[', j, '].is_free'))
        );
        SET j = j + 1;
      END WHILE;
    END IF;

    SET i = i + 1;
  END WHILE;

  COMMIT;

  -- Return the created learning path
  SELECT
    lp.id,
    lp.title,
    lp.description,
    lp.type,
    lp.difficulty_level,
    lp.total_modules,
    lp.completed_modules,
    lp.progress,
    lp.status,
    lp.estimated_duration_weeks,
    lp.time_spent_hours,
    lp.created_at
  FROM ai_learning_paths lp
  WHERE lp.id = v_path_id;
END$$

-- ========================================
-- PROCEDURE 11: Search Courses By Topics
-- ========================================
-- Searches platform courses matching module topics
-- Returns relevance-scored results
-- ========================================
DROP PROCEDURE IF EXISTS `search_courses_by_topics`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `search_courses_by_topics` (
  IN `p_topics_json` JSON,
  IN `p_module_title` VARCHAR(255),
  IN `p_difficulty_level` VARCHAR(20),
  IN `p_limit` INT
)
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE v_topic_count INT;
  DECLARE v_current_topic VARCHAR(255);
  DECLARE v_limit INT;

  SET v_topic_count = JSON_LENGTH(p_topics_json);
  SET v_limit = COALESCE(p_limit, 10);

  -- Create temp table to accumulate match scores
  DROP TEMPORARY TABLE IF EXISTS tmp_course_matches;
  CREATE TEMPORARY TABLE tmp_course_matches (
    course_id INT,
    match_count INT DEFAULT 0,
    matched_topics TEXT,
    PRIMARY KEY (course_id)
  );

  -- For each topic, find matching courses
  WHILE i < v_topic_count DO
    SET v_current_topic = JSON_UNQUOTE(JSON_EXTRACT(p_topics_json, CONCAT('$[', i, ']')));

    INSERT INTO tmp_course_matches (course_id, match_count, matched_topics)
    SELECT
      c.id,
      1,
      v_current_topic
    FROM course c
    LEFT JOIN course_category cat ON c.category_id = cat.id
    LEFT JOIN course_subcategory sc ON c.sub_category_id = sc.id
    WHERE c.status = 'published'
      AND c.is_deleted = 0
      AND (
        LOWER(c.title) LIKE CONCAT('%', LOWER(v_current_topic), '%')
        OR LOWER(c.short_description) LIKE CONCAT('%', LOWER(v_current_topic), '%')
        OR LOWER(COALESCE(c.meta_keywords, '')) LIKE CONCAT('%', LOWER(v_current_topic), '%')
        OR LOWER(COALESCE(cat.name, '')) LIKE CONCAT('%', LOWER(v_current_topic), '%')
        OR LOWER(COALESCE(sc.name, '')) LIKE CONCAT('%', LOWER(v_current_topic), '%')
      )
    ON DUPLICATE KEY UPDATE
      match_count = match_count + 1,
      matched_topics = CONCAT(matched_topics, ', ', v_current_topic);

    SET i = i + 1;
  END WHILE;

  -- Also match using the module title
  INSERT INTO tmp_course_matches (course_id, match_count, matched_topics)
  SELECT
    c.id,
    1,
    p_module_title
  FROM course c
  WHERE c.status = 'published'
    AND c.is_deleted = 0
    AND (
      LOWER(c.title) LIKE CONCAT('%', LOWER(p_module_title), '%')
      OR LOWER(COALESCE(c.meta_keywords, '')) LIKE CONCAT('%', LOWER(p_module_title), '%')
    )
  ON DUPLICATE KEY UPDATE
    match_count = match_count + 1,
    matched_topics = CONCAT(matched_topics, ', ', p_module_title);

  -- Return aggregated results with course details
  SELECT
    c.id as course_id,
    c.title,
    c.short_description,
    c.thumbnail,
    c.level,
    c.course_duration,
    tm.match_count as total_matches,
    ROUND(tm.match_count / (v_topic_count + 1), 2) as relevance_score,
    tm.matched_topics as match_reason
  FROM tmp_course_matches tm
  JOIN course c ON tm.course_id = c.id
  ORDER BY tm.match_count DESC, c.title ASC
  LIMIT v_limit;

  DROP TEMPORARY TABLE IF EXISTS tmp_course_matches;
END$$

DELIMITER ;

SELECT 'AI Learning Paths stored procedures created successfully!' AS status;
