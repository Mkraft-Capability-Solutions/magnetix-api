-- ========================================
-- Add Assessment Scoring Support
-- ========================================
-- Adds correct_answers to questions and score to responses
-- ========================================

USE lms_db;

-- Add correct_answers column to feedback_questions (if it doesn't exist)
-- For multiple choice questions, this will store array of correct option indices (0-based)
-- Example: [0, 2] means options at index 0 and 2 are correct
ALTER TABLE `feedback_questions`
ADD COLUMN `correct_answers` JSON DEFAULT NULL COMMENT 'Array of correct option indices for assessment questions' AFTER `options`,
ALGORITHM=INPLACE, LOCK=NONE;

-- Add score columns to feedback_responses
ALTER TABLE `feedback_responses`
ADD COLUMN `score` INT DEFAULT NULL COMMENT 'Total score for assessment submissions',
ADD COLUMN `max_score` INT DEFAULT NULL COMMENT 'Maximum possible score for the assessment',
ADD COLUMN `percentage` DECIMAL(5,2) DEFAULT NULL COMMENT 'Score as percentage (score/max_score * 100)';

SELECT 'Assessment scoring columns added successfully!' AS status;
