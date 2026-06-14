-- ========================================
-- Add Subjective Assessment Scoring Support
-- ========================================
-- Adds per-answer scoring fields to feedback_answers
-- for AI scoring and manual admin override
-- ========================================

USE lms_db;

-- Add scoring columns to feedback_answers
ALTER TABLE `feedback_answers`
ADD COLUMN `ai_score` DECIMAL(5,2) DEFAULT NULL COMMENT 'AI-generated score for subjective answers' AFTER `answer_rating`,
ADD COLUMN `manual_score` DECIMAL(5,2) DEFAULT NULL COMMENT 'Manual admin score (overrides AI score)' AFTER `ai_score`,
ADD COLUMN `max_score` DECIMAL(5,2) DEFAULT NULL COMMENT 'Maximum possible score for this question' AFTER `manual_score`,
ADD COLUMN `ai_feedback` TEXT DEFAULT NULL COMMENT 'AI-generated feedback/reasoning for the score' AFTER `max_score`;

SELECT 'Subjective scoring columns added successfully!' AS status;
