-- ========================================
-- LEVEL DEFINITIONS
-- ========================================
-- Defines XP thresholds for levels 1-20
-- Formula: XP = (N * 150) + ((N-1)² * 50)
-- ========================================

USE lms_db;

INSERT INTO level_definitions (level, xp_required, level_name) VALUES
(1, 0, 'Novice'),
(2, 100, 'Learner'),
(3, 250, 'Student'),
(4, 500, 'Dedicated'),
(5, 850, 'Bronze'),
(6, 1300, 'Committed'),
(7, 1900, 'Advanced'),
(8, 2600, 'Silver'),
(9, 3400, 'Expert'),
(10, 4300, 'Gold'),
(11, 5300, 'Master'),
(12, 6500, 'Elite'),
(13, 7900, 'Platinum'),
(14, 9500, 'Distinguished'),
(15, 11300, 'Diamond'),
(16, 13300, 'Champion'),
(17, 15600, 'Legend'),
(18, 18200, 'Mythic'),
(19, 21200, 'Immortal'),
(20, 25000, 'Grandmaster');

SELECT 'Level definitions inserted successfully!' AS status;
SELECT COUNT(*) AS total_levels FROM level_definitions;
