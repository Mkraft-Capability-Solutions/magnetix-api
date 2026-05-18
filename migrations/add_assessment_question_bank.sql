-- ========================================
-- Assessment Question Bank
-- ========================================
-- Stand-alone, reusable question repository used by the
-- Trainer / Admin / Super-Admin "Assessments → Question Bank" tab.
-- This is intentionally separate from feedback_questions (which is
-- tied to a single feedback_forms row) so questions can be reused
-- across multiple assessments.
-- ========================================

CREATE TABLE IF NOT EXISTS `assessment_question_bank` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `type` ENUM('MCQ','T/F','Essay','Short') NOT NULL,
  `difficulty` ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `topic` VARCHAR(255) NOT NULL DEFAULT 'General',
  `points` INT NOT NULL DEFAULT 10,
  `question` TEXT NOT NULL,
  `options` JSON NULL,
  `correct_answer` TEXT NULL,
  `created_by` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_aqb_topic` (`topic`),
  KEY `idx_aqb_type` (`type`),
  KEY `idx_aqb_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional seed so the UI is not empty on fresh installs.
INSERT INTO `assessment_question_bank`
  (`type`, `difficulty`, `topic`, `points`, `question`, `options`, `correct_answer`)
VALUES
  ('MCQ', 'medium', 'Leadership', 10,
   'What is the primary purpose of leadership in an organization?',
   JSON_ARRAY('To control employees','To inspire and guide teams toward goals','To maximize profits','To enforce rules'),
   'To inspire and guide teams toward goals'),
  ('T/F', 'easy', 'Programming', 5,
   'Python is a compiled language.',
   NULL, 'False'),
  ('Essay', 'hard', 'Programming', 20,
   'Explain the concept of object-oriented programming and its main principles.',
   NULL, NULL),
  ('Short', 'easy', 'Technical', 5,
   'What does API stand for?',
   NULL, NULL),
  ('MCQ', 'medium', 'Project Management', 10,
   'Which of the following is NOT a principle of Agile methodology?',
   JSON_ARRAY('Customer collaboration','Working software','Comprehensive documentation','Responding to change'),
   'Comprehensive documentation');

SELECT 'assessment_question_bank table created' AS status;
