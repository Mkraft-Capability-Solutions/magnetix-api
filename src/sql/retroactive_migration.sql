-- ========================================
-- RETROACTIVE GAMIFICATION MIGRATION
-- ========================================
-- One-time script to award historical points
-- Run this AFTER creating all tables and procedures
-- ========================================

USE lms_db;

-- ========================================
-- STEP 1: Initialize user_points for all users
-- ========================================
SELECT 'Initializing user_points for all users...' AS status;

INSERT INTO user_points (user_id, total_points, total_xp, current_level, current_streak, longest_streak)
SELECT
  uuid,
  0,
  0,
  1,
  0,
  0
FROM users
WHERE is_deleted = 0
ON DUPLICATE KEY UPDATE user_id = user_id;

SELECT CONCAT(ROW_COUNT(), ' users initialized') AS status;

-- ========================================
-- STEP 2: Run retroactive points calculation
-- ========================================
SELECT 'Calculating historical points for all users...' AS status;
SELECT 'This may take several minutes depending on data volume...' AS status;

CALL calculate_historical_points();

SELECT 'Historical points calculation completed!' AS status;

-- ========================================
-- STEP 3: Verification Queries
-- ========================================
SELECT 'Running verification queries...' AS status;

-- Total users with points
SELECT
  COUNT(*) AS total_users_with_points,
  SUM(total_points) AS total_points_awarded,
  SUM(total_xp) AS total_xp_awarded,
  AVG(current_level) AS average_level,
  MAX(current_level) AS highest_level
FROM user_points;

-- Points distribution by level
SELECT
  current_level,
  COUNT(*) AS user_count,
  MIN(total_points) AS min_points,
  MAX(total_points) AS max_points,
  AVG(total_points) AS avg_points
FROM user_points
GROUP BY current_level
ORDER BY current_level;

-- Transaction types summary
SELECT
  transaction_type,
  COUNT(*) AS transaction_count,
  SUM(points_earned) AS total_points,
  SUM(xp_earned) AS total_xp
FROM point_transactions
GROUP BY transaction_type
ORDER BY total_points DESC;

-- Top 10 users by points
SELECT
  u.first_name,
  u.last_name,
  u.email,
  up.total_points,
  up.total_xp,
  up.current_level,
  ld.level_name
FROM user_points up
INNER JOIN users u ON up.user_id = u.uuid
LEFT JOIN level_definitions ld ON up.current_level = ld.level
ORDER BY up.total_points DESC
LIMIT 10;

-- Achievement unlocks summary
SELECT
  ad.category,
  ad.badge_tier,
  COUNT(DISTINCT ua.user_id) AS users_unlocked
FROM user_achievements ua
INNER JOIN achievement_definitions ad ON ua.achievement_id = ad.id
WHERE ua.is_unlocked = 1
GROUP BY ad.category, ad.badge_tier
ORDER BY ad.category, ad.badge_tier;

-- Total achievements unlocked
SELECT
  COUNT(*) AS total_achievements_unlocked,
  COUNT(DISTINCT user_id) AS users_with_achievements
FROM user_achievements
WHERE is_unlocked = 1;

SELECT '========================================' AS '';
SELECT 'RETROACTIVE MIGRATION COMPLETED SUCCESSFULLY!' AS status;
SELECT '========================================' AS '';
SELECT 'Next steps:' AS '';
SELECT '1. Review verification queries above' AS '';
SELECT '2. Test the achievements page in frontend' AS '';
SELECT '3. Award points will now happen automatically for new activities' AS '';
SELECT '========================================' AS '';
