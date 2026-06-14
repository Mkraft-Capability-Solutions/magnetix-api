-- ========================================
-- Add Subjective Assessment Support
-- ========================================
-- Adds assessment_type (objective/subjective) to feedback_forms
-- Adds score field to feedback_questions
-- Adds slider question type
-- ========================================

USE lms_db;

-- Add assessment_type column to feedback_forms
-- For assessment forms, indicates whether it's objective (MCQ) or subjective (open-ended)
ALTER TABLE `feedback_forms`
ADD COLUMN `assessment_type` ENUM('objective', 'subjective') DEFAULT NULL
COMMENT 'Sub-type for assessment forms: objective (MCQ only) or subjective (open-ended with slider)'
AFTER `type`;

-- Add score column to feedback_questions
-- Each question can have a score value (default 1)
ALTER TABLE `feedback_questions`
ADD COLUMN `score` INT NOT NULL DEFAULT 1
COMMENT 'Score value assigned to this question'
AFTER `options`;

-- Extend question_type ENUM to include slider
ALTER TABLE `feedback_questions`
MODIFY COLUMN `question_type` ENUM('short_text', 'paragraph', 'multiple_choice_single', 'multiple_choice_multi', 'star_rating', 'slider') NOT NULL
COMMENT 'Type of question: short_text, paragraph, multiple_choice_single, multiple_choice_multi, star_rating, slider';

SELECT 'Subjective assessment support added successfully!' AS status;
