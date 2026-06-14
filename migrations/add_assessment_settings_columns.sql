-- ========================================
-- feedback_forms: assessment settings columns
-- ========================================
-- Adds the columns the Create Assessment UI sets but the table previously
-- ignored: time_limit_minutes, passing_score, max_attempts, randomize_questions.
-- These let the Assessment List cards and the Edit prefill round-trip.
--
-- The columns are added with plain ALTER TABLE. If a column already exists
-- the runner logs the duplicate-column error and continues — this is the
-- standard pattern used by other migrations in this repo.
-- ========================================

USE lms_db;

ALTER TABLE `feedback_forms` ADD COLUMN `time_limit_minutes` INT NULL AFTER `max_responses`;

ALTER TABLE `feedback_forms` ADD COLUMN `passing_score` INT NULL AFTER `time_limit_minutes`;

ALTER TABLE `feedback_forms` ADD COLUMN `max_attempts` INT NULL AFTER `passing_score`;

ALTER TABLE `feedback_forms` ADD COLUMN `randomize_questions` TINYINT(1) NOT NULL DEFAULT 0 AFTER `max_attempts`;

SELECT 'feedback_forms assessment settings columns ensured' AS status;
