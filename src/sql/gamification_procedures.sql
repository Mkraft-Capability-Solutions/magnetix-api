-- ========================================
-- GAMIFICATION SYSTEM STORED PROCEDURES
-- ========================================
-- Procedures for points, achievements, levels, and leaderboard
-- ========================================

USE magnetix_db;

DELIMITER $$

-- ========================================
-- PROCEDURE: award_points
-- Award points/XP to user, update level, log transaction
-- ========================================
DROP PROCEDURE IF EXISTS award_points$$
CREATE PROCEDURE award_points(
  IN p_user_id VARCHAR(36),
  IN p_points INT,
  IN p_xp INT,
  IN p_transaction_type VARCHAR(50),
  IN p_reference_type VARCHAR(50),
  IN p_reference_id INT,
  IN p_description TEXT
)
BEGIN
  DECLARE v_old_level INT;
  DECLARE v_new_level INT;
  DECLARE v_total_xp INT;

  -- Initialize user_points record if doesn't exist
  INSERT INTO user_points (user_id, total_points, total_xp, current_level)
  VALUES (p_user_id, 0, 0, 1)
  ON DUPLICATE KEY UPDATE user_id = user_id;

  -- Get current level
  SELECT current_level INTO v_old_level
  FROM user_points
  WHERE user_id = p_user_id;

  -- Update points and XP
  UPDATE user_points
  SET total_points = total_points + p_points,
      total_xp = total_xp + p_xp,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id;

  -- Get new total XP
  SELECT total_xp INTO v_total_xp
  FROM user_points
  WHERE user_id = p_user_id;

  -- Calculate new level based on XP
  SELECT COALESCE(MAX(level), 1) INTO v_new_level
  FROM level_definitions
  WHERE xp_required <= v_total_xp;

  -- Update level if changed
  IF v_new_level > v_old_level THEN
    UPDATE user_points
    SET current_level = v_new_level
    WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO point_transactions (
    user_id, points_earned, xp_earned, transaction_type,
    reference_type, reference_id, description
  ) VALUES (
    p_user_id, p_points, p_xp, p_transaction_type,
    p_reference_type, p_reference_id, p_description
  );

  -- Check for achievement unlocks
  CALL check_achievements(p_user_id);
END$$

-- ========================================
-- PROCEDURE: update_streak
-- Update daily login streak and award bonuses
-- ========================================
DROP PROCEDURE IF EXISTS update_streak$$
CREATE PROCEDURE update_streak(
  IN p_user_id VARCHAR(36)
)
BEGIN
  DECLARE v_last_activity DATE;
  DECLARE v_current_streak INT;
  DECLARE v_longest_streak INT;
  DECLARE v_new_streak INT;

  -- Get current streak data
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_points
  WHERE user_id = p_user_id;

  -- Calculate new streak
  IF v_last_activity IS NULL THEN
    SET v_new_streak = 1;
  ELSEIF v_last_activity = CURDATE() THEN
    -- Already logged in today, no change
    SET v_new_streak = v_current_streak;
  ELSEIF v_last_activity = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN
    -- Consecutive day
    SET v_new_streak = v_current_streak + 1;
  ELSE
    -- Streak broken
    SET v_new_streak = 1;
  END IF;

  -- Update streak only if it's a new day
  IF v_last_activity != CURDATE() OR v_last_activity IS NULL THEN
    UPDATE user_points
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(v_longest_streak, v_new_streak),
        last_activity_date = CURDATE()
    WHERE user_id = p_user_id;

    -- Award daily login points
    CALL award_points(p_user_id, 5, 0, 'daily_login', NULL, NULL, 'Daily login bonus');

    -- Award streak milestone bonuses
    IF v_new_streak = 7 THEN
      CALL award_points(p_user_id, 50, 20, 'streak_7', NULL, NULL, '7-day login streak bonus');
    ELSEIF v_new_streak = 30 THEN
      CALL award_points(p_user_id, 200, 100, 'streak_30', NULL, NULL, '30-day login streak bonus');
    ELSEIF v_new_streak = 100 THEN
      CALL award_points(p_user_id, 1000, 500, 'streak_100', NULL, NULL, '100-day login streak bonus');
    END IF;
  END IF;
END$$

-- ========================================
-- PROCEDURE: get_user_points
-- Get user point summary with level progress
-- ========================================
DROP PROCEDURE IF EXISTS get_user_points$$
CREATE PROCEDURE get_user_points(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    up.total_points,
    up.total_xp,
    up.current_level,
    ld.level_name AS current_level_name,
    up.current_streak,
    up.longest_streak,
    up.last_activity_date,
    ld.xp_required AS current_level_xp,
    COALESCE(ld_next.xp_required, 999999) AS next_level_xp,
    up.total_xp - ld.xp_required AS xp_progress,
    COALESCE(ld_next.xp_required, 999999) - ld.xp_required AS xp_needed
  FROM user_points up
  LEFT JOIN level_definitions ld ON up.current_level = ld.level
  LEFT JOIN level_definitions ld_next ON ld_next.level = up.current_level + 1
  WHERE up.user_id = p_user_id;
END$$

-- ========================================
-- PROCEDURE: get_point_history
-- Get paginated point transaction history
-- ========================================
DROP PROCEDURE IF EXISTS get_point_history$$
CREATE PROCEDURE get_point_history(
  IN p_user_id VARCHAR(36),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    points_earned,
    xp_earned,
    transaction_type,
    reference_type,
    reference_id,
    description,
    created_at
  FROM point_transactions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END$$

-- ========================================
-- PROCEDURE: check_achievements
-- Check all achievements and unlock if criteria met
-- ========================================
DROP PROCEDURE IF EXISTS check_achievements$$
CREATE PROCEDURE check_achievements(
  IN p_user_id VARCHAR(36)
)
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_achievement_id INT;
  DECLARE v_achievement_key VARCHAR(100);
  DECLARE v_criteria_type VARCHAR(50);
  DECLARE v_criteria_value INT;
  DECLARE v_points_reward INT;
  DECLARE v_xp_reward INT;
  DECLARE v_badge_tier VARCHAR(20);
  DECLARE v_current_progress INT;
  DECLARE v_is_unlocked TINYINT;

  DECLARE achievement_cursor CURSOR FOR
    SELECT id, achievement_key, unlock_criteria_type, unlock_criteria_value,
           points_reward, xp_reward, badge_tier
    FROM achievement_definitions
    WHERE is_active = 1;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN achievement_cursor;

  achievement_loop: LOOP
    FETCH achievement_cursor INTO v_achievement_id, v_achievement_key,
          v_criteria_type, v_criteria_value, v_points_reward, v_xp_reward, v_badge_tier;

    IF done THEN
      LEAVE achievement_loop;
    END IF;

    -- Initialize achievement tracking if doesn't exist
    INSERT INTO user_achievements (user_id, achievement_id, progress, total_required, is_unlocked)
    VALUES (p_user_id, v_achievement_id, 0, v_criteria_value, 0)
    ON DUPLICATE KEY UPDATE user_id = user_id;

    -- Check if already unlocked
    SELECT is_unlocked INTO v_is_unlocked
    FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

    IF v_is_unlocked = 0 THEN
      -- Calculate current progress based on criteria type
      SET v_current_progress = 0;

      IF v_criteria_type = 'course_enroll_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM enrol
        WHERE user_id = p_user_id;

      ELSEIF v_criteria_type = 'lesson_complete_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM course_progress cp
        INNER JOIN enrol e ON cp.enroll_id = e.id
        WHERE e.user_id = p_user_id AND cp.lesson_completed = 1;

      ELSEIF v_criteria_type = 'course_complete_count' THEN
        SELECT COUNT(DISTINCT e.course_id) INTO v_current_progress
        FROM enrol e
        WHERE e.user_id = p_user_id
        AND NOT EXISTS (
          SELECT 1 FROM course_lesson cl
          WHERE cl.course_id = e.course_id
          AND NOT EXISTS (
            SELECT 1 FROM course_progress cp
            WHERE cp.enroll_id = e.id
            AND cp.lesson_id = cl.id
            AND cp.lesson_completed = 1
          )
        )
        AND EXISTS (
          SELECT 1 FROM course_lesson cl WHERE cl.course_id = e.course_id
        );

      ELSEIF v_criteria_type = 'skills_achieved_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM achieved_skills
        WHERE user_id = p_user_id;

      ELSEIF v_criteria_type = 'certificates_approved_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM student_certificates
        WHERE user_id = p_user_id AND status = 'approved';

      ELSEIF v_criteria_type = 'mentorship_request_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM mentorship
        WHERE menteeId = p_user_id;

      ELSEIF v_criteria_type = 'mentorship_session_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM scheduled_sessions
        WHERE mentee_id = p_user_id AND status = 'booked';

      ELSEIF v_criteria_type = 'event_attend_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM event_attendees
        WHERE recipient_id = p_user_id;

      ELSEIF v_criteria_type = 'course_rating_count' THEN
        SELECT COUNT(*) INTO v_current_progress
        FROM course_rating
        WHERE user_id = p_user_id;

      ELSEIF v_criteria_type = 'login_streak' THEN
        SELECT current_streak INTO v_current_progress
        FROM user_points
        WHERE user_id = p_user_id;

      ELSEIF v_criteria_type = 'total_study_hours' THEN
        SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_date, end_date)) / 60, 0)
        INTO v_current_progress
        FROM student_session
        WHERE user_id = p_user_id;

      ELSEIF v_criteria_type = 'level_reached' THEN
        SELECT current_level INTO v_current_progress
        FROM user_points
        WHERE user_id = p_user_id;

      ELSEIF v_criteria_type = 'total_points' THEN
        SELECT total_points INTO v_current_progress
        FROM user_points
        WHERE user_id = p_user_id;

      ELSEIF v_criteria_type = 'course_complete_24h' THEN
        SELECT COUNT(DISTINCT e.course_id) INTO v_current_progress
        FROM enrol e
        WHERE e.user_id = p_user_id
        AND NOT EXISTS (
          SELECT 1 FROM course_lesson cl
          WHERE cl.course_id = e.course_id
          AND NOT EXISTS (
            SELECT 1 FROM course_progress cp
            WHERE cp.enroll_id = e.id
            AND cp.lesson_id = cl.id
            AND cp.lesson_completed = 1
          )
        )
        AND EXISTS (
          SELECT 1 FROM course_lesson cl WHERE cl.course_id = e.course_id
        )
        AND (
          SELECT MAX(cp2.last_access)
          FROM course_progress cp2
          WHERE cp2.enroll_id = e.id
        ) IS NOT NULL
        AND TIMESTAMPDIFF(HOUR, e.enrolled_date, (
          SELECT MAX(cp3.last_access)
          FROM course_progress cp3
          WHERE cp3.enroll_id = e.id
        )) <= 24;
      END IF;

      -- Update progress
      UPDATE user_achievements
      SET progress = v_current_progress
      WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

      -- Check if criteria met
      IF v_current_progress >= v_criteria_value THEN
        -- Unlock achievement
        UPDATE user_achievements
        SET is_unlocked = 1,
            unlocked_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

        -- Award XP bonus based on tier
        SET v_xp_reward = v_xp_reward +
          CASE v_badge_tier
            WHEN 'common' THEN 10
            WHEN 'rare' THEN 25
            WHEN 'epic' THEN 50
            ELSE 0
          END;

        -- Award points and XP
        CALL award_points(
          p_user_id,
          v_points_reward,
          v_xp_reward,
          'achievement_unlock',
          'achievement',
          v_achievement_id,
          CONCAT('Unlocked achievement: ', v_achievement_key)
        );
      END IF;
    END IF;
  END LOOP;

  CLOSE achievement_cursor;
END$$

-- ========================================
-- PROCEDURE: get_user_achievements_stats
-- Get achievement statistics for user
-- ========================================
DROP PROCEDURE IF EXISTS get_user_achievements_stats$$
CREATE PROCEDURE get_user_achievements_stats(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    COUNT(*) AS total_achievements,
    SUM(CASE WHEN is_unlocked = 1 THEN 1 ELSE 0 END) AS unlocked_count,
    SUM(CASE WHEN is_unlocked = 0 THEN 1 ELSE 0 END) AS in_progress_count,
    ROUND(SUM(CASE WHEN is_unlocked = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS completion_percentage
  FROM user_achievements
  WHERE user_id = p_user_id;
END$$

-- ========================================
-- PROCEDURE: get_unlocked_achievements
-- Get all unlocked achievements for user
-- ========================================
DROP PROCEDURE IF EXISTS get_unlocked_achievements$$
CREATE PROCEDURE get_unlocked_achievements(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    ad.achievement_key,
    ad.name,
    ad.description,
    ad.category,
    ad.badge_tier,
    ad.points_reward,
    ad.xp_reward,
    ad.icon_name,
    ua.unlocked_at,
    ua.progress,
    ua.total_required
  FROM user_achievements ua
  INNER JOIN achievement_definitions ad ON ua.achievement_id = ad.id
  WHERE ua.user_id = p_user_id AND ua.is_unlocked = 1
  ORDER BY ua.unlocked_at DESC;
END$$

-- ========================================
-- PROCEDURE: get_inprogress_achievements
-- Get all in-progress achievements for user
-- ========================================
DROP PROCEDURE IF EXISTS get_inprogress_achievements$$
CREATE PROCEDURE get_inprogress_achievements(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    ad.achievement_key,
    ad.name,
    ad.description,
    ad.category,
    ad.badge_tier,
    ad.points_reward,
    ad.xp_reward,
    ad.icon_name,
    ua.progress,
    ua.total_required,
    ROUND(ua.progress * 100.0 / ua.total_required, 1) AS progress_percentage
  FROM user_achievements ua
  INNER JOIN achievement_definitions ad ON ua.achievement_id = ad.id
  WHERE ua.user_id = p_user_id AND ua.is_unlocked = 0
  ORDER BY progress_percentage DESC, ad.category;
END$$

-- ========================================
-- PROCEDURE: get_leaderboard
-- Get leaderboard with time period filter
-- ========================================
DROP PROCEDURE IF EXISTS get_leaderboard$$
CREATE PROCEDURE get_leaderboard(
  IN p_period VARCHAR(20),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  DECLARE v_start_date TIMESTAMP;

  -- Calculate start date based on period
  IF p_period = 'daily' THEN
    SET v_start_date = DATE_SUB(NOW(), INTERVAL 1 DAY);
  ELSEIF p_period = 'weekly' THEN
    SET v_start_date = DATE_SUB(NOW(), INTERVAL 7 DAY);
  ELSEIF p_period = 'monthly' THEN
    SET v_start_date = DATE_SUB(NOW(), INTERVAL 30 DAY);
  ELSE
    SET v_start_date = '2000-01-01 00:00:00'; -- all_time (use a safer date)
  END IF;

  -- Get leaderboard using conditional ordering
  IF p_period = 'all_time' THEN
    SELECT
      u.uuid AS user_id,
      s.first_name,
      s.last_name,
      u.email,
      up.total_points,
      up.total_xp,
      up.current_level,
      ld.level_name,
      up.current_streak,
      COUNT(DISTINCT ua.id) AS achievements_unlocked,
      up.total_points AS period_points
    FROM user_points up
    INNER JOIN users u ON up.user_id = u.uuid
    INNER JOIN students s ON u.uuid = s.user_id
    LEFT JOIN level_definitions ld ON up.current_level = ld.level
    LEFT JOIN user_achievements ua ON up.user_id = ua.user_id AND ua.is_unlocked = 1
    WHERE u.is_deleted = 0
    GROUP BY up.user_id, s.first_name, s.last_name, u.email, up.total_points, up.total_xp, up.current_level, ld.level_name, up.current_streak
    ORDER BY up.total_points DESC
    LIMIT p_limit OFFSET p_offset;
  ELSE
    SELECT
      u.uuid AS user_id,
      s.first_name,
      s.last_name,
      u.email,
      up.total_points,
      up.total_xp,
      up.current_level,
      ld.level_name,
      up.current_streak,
      COUNT(DISTINCT ua.id) AS achievements_unlocked,
      COALESCE(SUM(CASE WHEN pt.created_at >= v_start_date THEN pt.points_earned ELSE 0 END), 0) AS period_points
    FROM user_points up
    INNER JOIN users u ON up.user_id = u.uuid
    INNER JOIN students s ON u.uuid = s.user_id
    LEFT JOIN level_definitions ld ON up.current_level = ld.level
    LEFT JOIN user_achievements ua ON up.user_id = ua.user_id AND ua.is_unlocked = 1
    LEFT JOIN point_transactions pt ON up.user_id = pt.user_id
    WHERE u.is_deleted = 0
    GROUP BY up.user_id, s.first_name, s.last_name, u.email, up.total_points, up.total_xp, up.current_level, ld.level_name, up.current_streak
    ORDER BY period_points DESC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END$$

-- ========================================
-- PROCEDURE: calculate_historical_points
-- One-time migration to award retroactive points
-- ========================================
DROP PROCEDURE IF EXISTS calculate_historical_points$$
CREATE PROCEDURE calculate_historical_points()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_user_id VARCHAR(36);

  DECLARE user_cursor CURSOR FOR
    SELECT uuid FROM users WHERE is_deleted = 0;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  -- Disable achievement checks temporarily for performance
  SET @check_achievements_enabled = 0;

  OPEN user_cursor;

  user_loop: LOOP
    FETCH user_cursor INTO v_user_id;

    IF done THEN
      LEAVE user_loop;
    END IF;

    -- Initialize user_points record
    INSERT INTO user_points (user_id, total_points, total_xp, current_level)
    VALUES (v_user_id, 0, 0, 1)
    ON DUPLICATE KEY UPDATE user_id = user_id;

    -- Award points for course enrollments (5 points each)
    INSERT INTO point_transactions (user_id, points_earned, xp_earned, transaction_type, reference_type, reference_id, description)
    SELECT v_user_id, 5, 0, 'course_enroll', 'enrollment', id, CONCAT('Enrolled in course')
    FROM enrol
    WHERE user_id = v_user_id;

    -- Award points for lesson completions (10 points each)
    INSERT INTO point_transactions (user_id, points_earned, xp_earned, transaction_type, reference_type, reference_id, description)
    SELECT v_user_id, 10, 0, 'lesson_complete', 'lesson', cp.id, CONCAT('Completed lesson')
    FROM course_progress cp
    INNER JOIN enrol e ON cp.enroll_id = e.id
    WHERE e.user_id = v_user_id AND cp.lesson_completed = 1;

    -- Award points for course completions (100 points, 50 XP each)
    INSERT INTO point_transactions (user_id, points_earned, xp_earned, transaction_type, reference_type, reference_id, description)
    SELECT v_user_id, 100, 50, 'course_complete', 'enrollment', e.id, CONCAT('Completed course')
    FROM enrol e
    WHERE e.user_id = v_user_id
    AND NOT EXISTS (
      SELECT 1 FROM course_lesson cl
      WHERE cl.course_id = e.course_id
      AND NOT EXISTS (
        SELECT 1 FROM course_progress cp
        WHERE cp.enroll_id = e.id
        AND cp.lesson_id = cl.id
        AND cp.lesson_completed = 1
      )
    )
    AND EXISTS (
      SELECT 1 FROM course_lesson cl WHERE cl.course_id = e.course_id
    );

    -- Award points for skills achieved (15 points each)
    INSERT INTO point_transactions (user_id, points_earned, xp_earned, transaction_type, reference_type, reference_id, description)
    SELECT v_user_id, 15, 0, 'skill_achieved', 'skill', id, CONCAT('Achieved skill')
    FROM achieved_skills
    WHERE user_id = v_user_id;

    -- Award points for approved certificates (150 points, 75 XP each)
    INSERT INTO point_transactions (user_id, points_earned, xp_earned, transaction_type, reference_type, reference_id, description)
    SELECT v_user_id, 150, 75, 'certificate_approved', 'certificate', id, CONCAT('Certificate approved')
    FROM student_certificates
    WHERE user_id = v_user_id AND status = 'approved';

    -- Award points for mentorship sessions (25 points, 10 XP each)
    INSERT INTO point_transactions (user_id, points_earned, xp_earned, transaction_type, reference_type, reference_id, description)
    SELECT v_user_id, 25, 10, 'mentorship_session', 'session', id, CONCAT('Completed mentorship session')
    FROM scheduled_sessions
    WHERE mentee_id = v_user_id AND status = 'booked';

    -- Award points for event attendance (20 points, 5 XP each)
    INSERT INTO point_transactions (user_id, points_earned, xp_earned, transaction_type, reference_type, reference_id, description)
    SELECT v_user_id, 20, 5, 'event_attend', 'event', id, CONCAT('Attended event')
    FROM event_attendees
    WHERE recipient_id = v_user_id;

    -- Update total points and XP
    UPDATE user_points up
    SET total_points = (
      SELECT COALESCE(SUM(points_earned), 0)
      FROM point_transactions
      WHERE user_id = v_user_id
    ),
    total_xp = (
      SELECT COALESCE(SUM(xp_earned), 0)
      FROM point_transactions
      WHERE user_id = v_user_id
    )
    WHERE up.user_id = v_user_id;

    -- Calculate level based on total XP
    UPDATE user_points up
    SET current_level = (
      SELECT COALESCE(MAX(level), 1)
      FROM level_definitions
      WHERE xp_required <= up.total_xp
    )
    WHERE up.user_id = v_user_id;

    -- Check achievements for this user
    CALL check_achievements(v_user_id);

  END LOOP;

  CLOSE user_cursor;

  -- Re-enable achievement checks
  SET @check_achievements_enabled = 1;
END$$

DELIMITER ;

SELECT 'Gamification stored procedures created successfully!' AS status;
