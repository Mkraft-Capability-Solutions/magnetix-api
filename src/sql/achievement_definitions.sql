-- ========================================
-- ACHIEVEMENT DEFINITIONS
-- ========================================
-- Inserts 26 predefined achievements across 5 categories
-- ========================================

USE lms_db;

-- ========================================
-- LEARNING CATEGORY ACHIEVEMENTS
-- ========================================

-- Common Tier Learning
INSERT INTO achievement_definitions (achievement_key, name, description, category, badge_tier, points_reward, xp_reward, unlock_criteria_type, unlock_criteria_value, icon_name) VALUES
('first_enrollment', 'Getting Started', 'Enroll in your first course', 'learning', 'common', 10, 5, 'course_enroll_count', 1, 'BookOpen'),
('first_lesson', 'First Steps', 'Complete your first lesson', 'learning', 'common', 10, 5, 'lesson_complete_count', 1, 'CheckCircle'),
('course_collector', 'Course Collector', 'Enroll in 5 courses', 'learning', 'common', 25, 10, 'course_enroll_count', 5, 'Library'),
('lesson_learner', 'Lesson Learner', 'Complete 10 lessons', 'learning', 'common', 50, 20, 'lesson_complete_count', 10, 'GraduationCap');

-- Rare Tier Learning
INSERT INTO achievement_definitions (achievement_key, name, description, category, badge_tier, points_reward, xp_reward, unlock_criteria_type, unlock_criteria_value, icon_name) VALUES
('dedicated_student', 'Dedicated Student', 'Complete 25 lessons', 'learning', 'rare', 100, 40, 'lesson_complete_count', 25, 'Star'),
('course_finisher', 'Course Finisher', 'Complete your first course', 'learning', 'rare', 100, 50, 'course_complete_count', 1, 'Award'),
('knowledge_seeker', 'Knowledge Seeker', 'Complete 5 courses', 'learning', 'rare', 250, 100, 'course_complete_count', 5, 'Trophy');

-- Epic Tier Learning
INSERT INTO achievement_definitions (achievement_key, name, description, category, badge_tier, points_reward, xp_reward, unlock_criteria_type, unlock_criteria_value, icon_name) VALUES
('master_learner', 'Master Learner', 'Complete 10 courses', 'learning', 'epic', 500, 250, 'course_complete_count', 10, 'Crown'),
('lesson_centurion', 'Lesson Centurion', 'Complete 100 lessons', 'learning', 'epic', 750, 350, 'lesson_complete_count', 100, 'Zap'),
('speed_learner', 'Speed Learner', 'Complete a course in under 24 hours', 'learning', 'epic', 150, 75, 'course_complete_24h', 1, 'Rocket');

-- ========================================
-- MASTERY CATEGORY ACHIEVEMENTS
-- ========================================

INSERT INTO achievement_definitions (achievement_key, name, description, category, badge_tier, points_reward, xp_reward, unlock_criteria_type, unlock_criteria_value, icon_name) VALUES
('skill_collector', 'Skill Collector', 'Achieve 5 skills', 'mastery', 'common', 50, 20, 'skills_achieved_count', 5, 'Target'),
('skill_master', 'Skill Master', 'Achieve 10 skills', 'mastery', 'rare', 100, 50, 'skills_achieved_count', 10, 'Award'),
('skill_legend', 'Skill Legend', 'Achieve 25 skills', 'mastery', 'epic', 300, 150, 'skills_achieved_count', 25, 'Medal'),
('certified_professional', 'Certified Professional', 'Get 1 certificate approved', 'mastery', 'rare', 150, 75, 'certificates_approved_count', 1, 'FileCheck');

-- ========================================
-- SOCIAL CATEGORY ACHIEVEMENTS
-- ========================================

INSERT INTO achievement_definitions (achievement_key, name, description, category, badge_tier, points_reward, xp_reward, unlock_criteria_type, unlock_criteria_value, icon_name) VALUES
('mentorship_starter', 'Mentorship Starter', 'Request your first mentor', 'social', 'common', 10, 5, 'mentorship_request_count', 1, 'Users'),
('session_attendee', 'Session Attendee', 'Complete 5 mentorship sessions', 'social', 'rare', 75, 35, 'mentorship_session_count', 5, 'MessageCircle'),
('event_enthusiast', 'Event Enthusiast', 'Attend 3 events', 'social', 'rare', 60, 30, 'event_attend_count', 3, 'Calendar'),
('community_contributor', 'Community Contributor', 'Rate 5 courses', 'social', 'common', 25, 10, 'course_rating_count', 5, 'ThumbsUp');

-- ========================================
-- CONSISTENCY CATEGORY ACHIEVEMENTS
-- ========================================

INSERT INTO achievement_definitions (achievement_key, name, description, category, badge_tier, points_reward, xp_reward, unlock_criteria_type, unlock_criteria_value, icon_name) VALUES
('daily_visitor', 'Daily Visitor', 'Login for 3 consecutive days', 'consistency', 'common', 15, 5, 'login_streak', 3, 'Calendar'),
('weekly_warrior', 'Weekly Warrior', 'Login for 7 consecutive days', 'consistency', 'rare', 50, 25, 'login_streak', 7, 'Flame'),
('monthly_master', 'Monthly Master', 'Login for 30 consecutive days', 'consistency', 'epic', 200, 100, 'login_streak', 30, 'Fire'),
('study_enthusiast', 'Study Enthusiast', 'Study for 10 total hours', 'consistency', 'common', 50, 20, 'total_study_hours', 10, 'Clock');

-- ========================================
-- MILESTONE CATEGORY ACHIEVEMENTS
-- ========================================

INSERT INTO achievement_definitions (achievement_key, name, description, category, badge_tier, points_reward, xp_reward, unlock_criteria_type, unlock_criteria_value, icon_name) VALUES
('bronze_achiever', 'Bronze Achiever', 'Reach level 5', 'milestone', 'common', 0, 50, 'level_reached', 5, 'Medal'),
('silver_achiever', 'Silver Achiever', 'Reach level 10', 'milestone', 'rare', 0, 100, 'level_reached', 10, 'Medal'),
('gold_achiever', 'Gold Achiever', 'Reach level 15', 'milestone', 'epic', 0, 200, 'level_reached', 15, 'Medal'),
('point_millionaire', 'Point Millionaire', 'Earn 10,000 total points', 'milestone', 'epic', 0, 500, 'total_points', 10000, 'Coins');

SELECT 'Achievement definitions inserted successfully!' AS status;
SELECT COUNT(*) AS total_achievements FROM achievement_definitions;
